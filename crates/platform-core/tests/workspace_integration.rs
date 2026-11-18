//! Run with TEST_DATABASE_URL pointing to the disposable nexus_platform_test database.
use actix_web::{
    http::{Method, StatusCode},
    test, web, App,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use nexus_platform_core::authz::PolicyEngine;
use nexus_platform_core::workspace::{self, auth::AssertionVerifier, jobs, WorkspaceState};
use serde_json::{json, Value};
use sha2::Sha256;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{sync::Arc, time::Duration};
use uuid::Uuid;
const SECRET: &str = "isolated-test-secret-more-than-thirty-two-bytes";
struct Fixture {
    state: WorkspaceState,
    base: PgPool,
    schema: String,
    owner: Uuid,
    other: Uuid,
    viewer: Uuid,
    engineer: Uuid,
    workspace: Uuid,
}
impl Fixture {
    async fn new() -> Self {
        let url = std::env::var("TEST_DATABASE_URL").expect("TEST_DATABASE_URL required");
        assert!(
            url.split('?')
                .next()
                .unwrap()
                .ends_with("/nexus_platform_test"),
            "Refusing to modify any database except nexus_platform_test"
        );
        let base = PgPoolOptions::new()
            .max_connections(2)
            .connect(&url)
            .await
            .unwrap();
        let schema = format!("test_{}", Uuid::new_v4().simple());
        sqlx::query(&format!("CREATE SCHEMA {schema}"))
            .execute(&base)
            .await
            .unwrap();
        let search = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .after_connect(move |conn, _| {
                let query = format!("SET search_path TO {search}");
                Box::pin(async move {
                    sqlx::query(&query).execute(conn).await?;
                    Ok(())
                })
            })
            .connect(&url)
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let owner = Uuid::new_v4();
        let other = Uuid::new_v4();
        let viewer = Uuid::new_v4();
        let engineer = Uuid::new_v4();
        let workspace = Uuid::new_v4();
        let other_workspace = Uuid::new_v4();
        for (id, name) in [
            (workspace, "Organization A"),
            (other_workspace, "Organization B"),
        ] {
            sqlx::query("INSERT INTO platform_workspaces(id,name) VALUES($1,$2)")
                .bind(id)
                .bind(name)
                .execute(&pool)
                .await
                .unwrap();
        }
        for (user_id, workspace_id, role) in [
            (owner, workspace, "owner"),
            (viewer, workspace, "viewer"),
            (engineer, workspace, "design_engineer"),
            (other, other_workspace, "owner"),
        ] {
            sqlx::query("INSERT INTO platform_memberships VALUES($1,$2,$3)")
                .bind(workspace_id)
                .bind(user_id)
                .bind(role)
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO platform_user_context VALUES($1,$2)")
                .bind(user_id)
                .bind(workspace_id)
                .execute(&pool)
                .await
                .unwrap();
        }
        Self {
            state: WorkspaceState {
                model_enabled: false,
                pool,
                verifier: AssertionVerifier::new(SECRET).unwrap(),
                policies: Arc::new(PolicyEngine::new(workspace::workspace_policies())),
                ingest_url: "http://127.0.0.1:0".into(),
                client: reqwest::Client::builder()
                    .timeout(Duration::from_secs(2))
                    .build()
                    .unwrap(),
            },
            base,
            schema,
            owner,
            other,
            viewer,
            engineer,
            workspace,
        }
    }
    async fn done(self) {
        self.state.pool.close().await;
        sqlx::query(&format!("DROP SCHEMA {} CASCADE", self.schema))
            .execute(&self.base)
            .await
            .unwrap();
        self.base.close().await;
    }
    fn token(&self, user: Uuid) -> String {
        let now = chrono::Utc::now().timestamp();
        let payload = URL_SAFE_NO_PAD
            .encode(json!({"sub":user,"iat":now,"exp":now+30,"aud":"nexus-workspace"}).to_string());
        let mut mac = Hmac::<Sha256>::new_from_slice(SECRET.as_bytes()).unwrap();
        mac.update(payload.as_bytes());
        format!(
            "{payload}.{}",
            URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
        )
    }
}
fn request(method: Method, path: &str, body: Value, token: &str) -> actix_http::Request {
    test::TestRequest::default()
        .method(method)
        .uri(path)
        .insert_header(("authorization", format!("Bearer {token}")))
        .insert_header(("idempotency-key", "11111111-1111-4111-8111-111111111111"))
        .set_json(body)
        .to_request()
}
fn input() -> Value {
    json!({"name":"Controller","raw_content":"MPN,Quantity\nSTM32F401RET6,10\nLM1117-3.3,40"})
}
#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn persisted_boms_enforce_identity_tenant_and_role() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let response = test::call_service(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::CREATED);
    let bom: Value = test::read_body_json(response).await;
    let path = format!("/api/v1/workspace/boms/{}", bom["id"].as_str().unwrap());
    for (user, expected) in [
        (f.viewer, StatusCode::OK),
        (f.engineer, StatusCode::OK),
        (f.other, StatusCode::NOT_FOUND),
    ] {
        assert_eq!(
            test::call_service(&app, request(Method::GET, &path, json!({}), &f.token(user)))
                .await
                .status(),
            expected
        );
    }
    let mut update = input();
    update["revision"] = json!(1);
    assert_eq!(
        test::call_service(
            &app,
            request(Method::PUT, &path, update.clone(), &f.token(f.viewer))
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        test::call_service(&app, request(Method::PUT, &path, update, &f.token(f.other)))
            .await
            .status(),
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                "/api/v1/workspace/boms",
                input(),
                &f.token(f.viewer)
            )
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        test::call_service(&app, request(Method::GET, &path, json!({}), "forged-token"))
            .await
            .status(),
        StatusCode::UNAUTHORIZED
    );
    let mut spoof = input();
    spoof["workspace_id"] = json!(f.workspace);
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                "/api/v1/workspace/boms",
                spoof,
                &f.token(f.other)
            )
        )
        .await
        .status(),
        StatusCode::BAD_REQUEST
    );
    let denied: i64 =
        sqlx::query_scalar("SELECT count(*) FROM platform_audit WHERE decision='deny'")
            .fetch_one(&f.state.pool)
            .await
            .unwrap();
    assert!(denied >= 4);
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM platform_boms")
        .fetch_one(&f.state.pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
    f.done().await;
}
#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn revisions_are_atomic_and_revocation_applies_to_existing_assertions() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let bom: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    let path = format!("/api/v1/workspace/boms/{}", bom["id"].as_str().unwrap());
    let engineer_token = f.token(f.engineer);
    let mut edit = input();
    edit["name"] = json!("Revised board");
    edit["revision"] = json!(1);
    let updated: Value = test::call_and_read_body_json(
        &app,
        request(Method::PUT, &path, edit.clone(), &engineer_token),
    )
    .await;
    assert_eq!(updated["revision"], 2);
    assert_eq!(
        test::call_service(
            &app,
            request(Method::PUT, &path, edit.clone(), &engineer_token)
        )
        .await
        .status(),
        StatusCode::CONFLICT
    );
    sqlx::query("UPDATE platform_memberships SET role='viewer' WHERE user_id=$1")
        .bind(f.engineer)
        .execute(&f.state.pool)
        .await
        .unwrap();
    edit["revision"] = json!(2);
    assert_eq!(
        test::call_service(&app, request(Method::PUT, &path, edit, &engineer_token))
            .await
            .status(),
        StatusCode::FORBIDDEN
    );
    let revision: i64 = sqlx::query_scalar("SELECT revision FROM platform_boms")
        .fetch_one(&f.state.pool)
        .await
        .unwrap();
    assert_eq!(revision, 2);
    let updates: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM platform_audit WHERE action='bom.update' AND decision='allow'",
    )
    .fetch_one(&f.state.pool)
    .await
    .unwrap();
    assert_eq!(updates, 1);
    f.done().await;
}
#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn membership_changes_require_owner_and_switching_requires_membership() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let path = format!("/api/v1/workspace/members/{}", f.other);
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::PUT,
                &path,
                json!({"role":"design_engineer"}),
                &f.token(f.viewer)
            )
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                "/api/v1/workspace/context",
                json!({"workspace_id":f.workspace}),
                &f.token(f.other)
            )
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::PUT,
                &path,
                json!({"role":"viewer"}),
                &f.token(f.owner)
            )
        )
        .await
        .status(),
        StatusCode::OK
    );
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                "/api/v1/workspace/context",
                json!({"workspace_id":f.workspace}),
                &f.token(f.other)
            )
        )
        .await
        .status(),
        StatusCode::OK
    );
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                "/api/v1/workspace/boms",
                input(),
                &f.token(f.other)
            )
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::GET,
                "/api/v1/workspace/audit",
                json!({}),
                &f.token(f.viewer)
            )
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    f.done().await;
}
#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn jobs_are_idempotent_leased_and_fenced_against_stale_or_cancelled_workers() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let bom: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    let payload = json!({"bom_id":bom["id"],"revision":1});
    let first: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/jobs",
            payload.clone(),
            &f.token(f.owner),
        ),
    )
    .await;
    let duplicate: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/jobs",
            payload.clone(),
            &f.token(f.owner),
        ),
    )
    .await;
    assert_eq!(first["id"], duplicate["id"]);
    // An already accepted submission remains idempotent after the source BOM changes.
    sqlx::query("UPDATE platform_boms SET revision=2")
        .execute(&f.state.pool)
        .await
        .unwrap();
    let replay: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/jobs",
            json!({"bom_id":bom["id"],"revision":1}),
            &f.token(f.owner),
        ),
    )
    .await;
    assert_eq!(replay["id"], first["id"]);

    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                "/api/v1/workspace/jobs",
                payload,
                &f.token(f.viewer)
            )
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    let (a, b) = tokio::join!(jobs::claim(&f.state.pool), jobs::claim(&f.state.pool));
    let a = a.unwrap();
    let b = b.unwrap();
    assert_ne!(a.is_some(), b.is_some());
    let old = a.or(b).unwrap();
    assert_eq!(old.attempt, 1);
    sqlx::query("UPDATE platform_jobs SET lease_until=now()-interval '1 second' WHERE id=$1")
        .bind(old.id)
        .execute(&f.state.pool)
        .await
        .unwrap();
    let recovered = jobs::claim(&f.state.pool).await.unwrap().unwrap();
    assert_eq!(recovered.attempt, 2);
    assert_ne!(recovered.lease_token, old.lease_token);
    assert!(
        !jobs::checkpoint(&f.state.pool, &old, 2, &json!({"results":[]}))
            .await
            .unwrap()
    );
    let path = format!("/api/v1/workspace/jobs/{}/cancel", old.id);
    assert_eq!(
        test::call_service(
            &app,
            request(Method::POST, &path, json!({}), &f.token(f.owner))
        )
        .await
        .status(),
        StatusCode::OK
    );
    assert!(
        !jobs::finish(&f.state.pool, &recovered, &json!({"results":[]}))
            .await
            .unwrap()
    );
    let state: String = sqlx::query_scalar("SELECT state FROM platform_jobs WHERE id=$1")
        .bind(old.id)
        .fetch_one(&f.state.pool)
        .await
        .unwrap();
    assert_eq!(state, "cancelled");
    f.done().await;
}
#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn retries_obey_backoff_and_terminal_attempt_limits() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let bom: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    test::call_service(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/jobs",
            json!({"bom_id":bom["id"],"revision":1}),
            &f.token(f.owner),
        ),
    )
    .await;
    for attempt in 1..=3 {
        let job = jobs::claim(&f.state.pool).await.unwrap().unwrap();
        assert_eq!(job.attempt, attempt);
        jobs::fail(&f.state.pool, &job, "fixture transient failure", true)
            .await
            .unwrap();
        if attempt < 3 {
            assert!(jobs::claim(&f.state.pool).await.unwrap().is_none());
            sqlx::query("UPDATE platform_jobs SET available_at=now()-interval '1 second'")
                .execute(&f.state.pool)
                .await
                .unwrap();
        }
    }
    assert!(jobs::claim(&f.state.pool).await.unwrap().is_none());
    let state: String = sqlx::query_scalar("SELECT state FROM platform_jobs")
        .fetch_one(&f.state.pool)
        .await
        .unwrap();
    assert_eq!(state, "failed");
    f.done().await;
}
#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn worker_processes_real_http_batches_and_persists_results() {
    let mut f = Fixture::new().await;
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let server=actix_web::HttpServer::new(||App::new().route("/api/v1/ingest/enrich-batch",web::post().to(|body:web::Json<Value>|async move{actix_web::HttpResponse::Ok().json(json!({"results":body["mpns"].as_array().unwrap().iter().map(|mpn|json!({"query_mpn":mpn,"normalized_mpn":mpn,"data_source":"reference","offers":[],"best_unit_price_at_qty":3.0,"max_lead_time_weeks":26,"distributor_count":1,"is_single_source":true,"total_stock":0,"lifecycle_status":"Active"})).collect::<Vec<_>>()}))}))).listen(listener).unwrap().run();
    let handle = server.handle();
    actix_web::rt::spawn(server);
    f.state.ingest_url = format!("http://{address}");
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let bom: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    let job: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/jobs",
            json!({"bom_id":bom["id"],"revision":1}),
            &f.token(f.owner),
        ),
    )
    .await;
    let id = Uuid::parse_str(job["id"].as_str().unwrap()).unwrap();
    // Simulate a worker dying after its first quantity group was checkpointed.
    let interrupted = jobs::claim(&f.state.pool).await.unwrap().unwrap();
    assert!(jobs::checkpoint(&f.state.pool,&interrupted,1,&json!({"results":[{"query_mpn":"STM32F401RET6","required_quantity":10,"data_source":"reference","best_unit_price_at_qty":2.0,"max_lead_time_weeks":6,"distributor_count":2,"total_stock":1000,"lifecycle_status":"Active"}]})).await.unwrap());
    sqlx::query("UPDATE platform_jobs SET lease_until=now()-interval '1 second' WHERE id=$1")
        .bind(id)
        .execute(&f.state.pool)
        .await
        .unwrap();
    let workers = jobs::start_workers(f.state.clone());
    let completed = tokio::time::timeout(Duration::from_secs(6), async {
        loop {
            let row: jobs::Job = sqlx::query_as("SELECT * FROM platform_jobs WHERE id=$1")
                .bind(id)
                .fetch_one(&f.state.pool)
                .await
                .unwrap();
            if row.state == "completed" {
                break row;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    })
    .await
    .unwrap();
    assert_eq!(completed.attempt, 2);
    assert_eq!(completed.progress, 2);
    let result = completed.result.unwrap().0;
    let results = &result["results"];
    assert_eq!(result["summary"]["total_extended_cost_usd"], 140.0);
    assert_eq!(result["summary"]["priced_parts"], 2);
    assert_eq!(result["summary"]["reference_count"], 2);
    assert_eq!(result["summary"]["live_count"], 0);
    assert_eq!(result["summary"]["attention_count"], 1);
    assert!(results[0]["ml_risk_prediction"]["risk_score"].is_number());
    assert_eq!(results[1]["ml_risk_prediction"]["validated"], false);
    assert_eq!(results.as_array().unwrap().len(), 2);
    assert_eq!(results[0]["required_quantity"], 10);
    assert_eq!(results[1]["required_quantity"], 40);
    for worker in workers {
        worker.abort();
    }
    handle.stop(false).await;
    f.done().await;
}

#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn workspace_queue_capacity_applies_atomically_but_allows_idempotent_replays() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let bom: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    let payload = json!({"bom_id":bom["id"],"revision":1});
    let first_key = Uuid::new_v4();
    for i in 0..21 {
        let key = if i == 0 { first_key } else { Uuid::new_v4() };
        let req = test::TestRequest::post()
            .uri("/api/v1/workspace/jobs")
            .insert_header(("authorization", format!("Bearer {}", f.token(f.owner))))
            .insert_header(("idempotency-key", key.to_string()))
            .set_json(&payload)
            .to_request();
        let response = test::call_service(&app, req).await;
        assert_eq!(
            response.status(),
            if i < 20 {
                StatusCode::ACCEPTED
            } else {
                StatusCode::TOO_MANY_REQUESTS
            }
        );
    }
    let replay = test::TestRequest::post()
        .uri("/api/v1/workspace/jobs")
        .insert_header(("authorization", format!("Bearer {}", f.token(f.owner))))
        .insert_header(("idempotency-key", first_key.to_string()))
        .set_json(&payload)
        .to_request();
    assert_eq!(
        test::call_service(&app, replay).await.status(),
        StatusCode::ACCEPTED
    );
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM platform_jobs")
        .fetch_one(&f.state.pool)
        .await
        .unwrap();
    assert_eq!(count, 20);
    f.done().await;
}

#[actix_rt::test]
#[ignore = "requires isolated PostgreSQL"]
async fn briefs_are_snapshot_scoped_cached_role_checked_and_budgeted() {
    let f = Fixture::new().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(f.state.clone()))
            .configure(workspace::configure),
    )
    .await;
    let bom: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/boms",
            input(),
            &f.token(f.owner),
        ),
    )
    .await;
    let job: Value = test::call_and_read_body_json(
        &app,
        request(
            Method::POST,
            "/api/v1/workspace/jobs",
            json!({"bom_id":bom["id"],"revision":1}),
            &f.token(f.owner),
        ),
    )
    .await;
    let id = Uuid::parse_str(job["id"].as_str().unwrap()).unwrap();
    let path = format!("/api/v1/workspace/jobs/{id}/brief");
    assert_eq!(
        test::call_service(
            &app,
            request(Method::POST, &path, json!({}), &f.token(f.owner))
        )
        .await
        .status(),
        StatusCode::UNPROCESSABLE_ENTITY
    );
    sqlx::query("UPDATE platform_jobs SET state='completed',progress=total,result=$1 WHERE workspace_id=$2 AND id=$3").bind(json!({"results":[{"query_mpn":"PART","data_source":"reference","required_quantity":10,"max_lead_time_weeks":0}],"summary":{"total_extended_cost_usd":null}})).bind(f.workspace).bind(id).execute(&f.state.pool).await.unwrap();
    assert_eq!(
        test::call_service(
            &app,
            request(Method::POST, &path, json!({}), &f.token(f.other))
        )
        .await
        .status(),
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        test::call_service(
            &app,
            request(Method::POST, &path, json!({}), &f.token(f.viewer))
        )
        .await
        .status(),
        StatusCode::FORBIDDEN
    );
    let report: Value = test::call_and_read_body_json(
        &app,
        request(Method::POST, &path, json!({}), &f.token(f.engineer)),
    )
    .await;
    assert_eq!(report["mode"], "rules");
    assert_eq!(report["fallback_reason"], "not_configured");
    assert_eq!(report["bom_revision"], 1);
    assert!(report["summary"]["total_extended_cost_usd"].is_null());
    assert!(report["recommendations"][0]["message"]
        .as_str()
        .unwrap()
        .contains("unknown"));
    let cached: Value = test::call_and_read_body_json(
        &app,
        request(Method::POST, &path, json!({}), &f.token(f.owner)),
    )
    .await;
    assert_eq!(cached, report);
    assert_eq!(
        test::call_service(
            &app,
            request(Method::GET, &path, json!({}), &f.token(f.viewer))
        )
        .await
        .status(),
        StatusCode::OK
    );
    assert_eq!(
        test::call_service(
            &app,
            request(Method::GET, &path, json!({}), &f.token(f.other))
        )
        .await
        .status(),
        StatusCode::NOT_FOUND
    );
    for _ in 0..4 {
        assert_eq!(
            test::call_service(
                &app,
                request(
                    Method::POST,
                    &path,
                    json!({"refresh":true}),
                    &f.token(f.owner)
                )
            )
            .await
            .status(),
            StatusCode::OK
        );
    }
    assert_eq!(
        test::call_service(
            &app,
            request(
                Method::POST,
                &path,
                json!({"refresh":true}),
                &f.token(f.owner)
            )
        )
        .await
        .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM platform_audit WHERE workspace_id=$1 AND action='job.brief.requested'").bind(f.workspace).fetch_one(&f.state.pool).await.unwrap();
    assert_eq!(count, 5);
    f.done().await;
}
