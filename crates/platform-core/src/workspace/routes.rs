use super::*;
use actix_web::{HttpRequest, Responder};
use serde_json::json;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/workspace")
            .app_data(web::JsonConfig::default().limit(2_000_000))
            .route("/context", web::get().to(context))
            .route("/context", web::post().to(switch_context))
            .route("/boms", web::get().to(list))
            .route("/boms", web::post().to(create))
            .route("/boms/{id}", web::get().to(get))
            .route("/boms/{id}", web::put().to(update))
            .route("/members", web::get().to(members))
            .route("/members/{id}", web::put().to(set_member))
            .route("/audit", web::get().to(audit_events))
            .route("/jobs", web::get().to(super::jobs::list))
            .route("/jobs", web::post().to(super::jobs::submit))
            .route("/jobs/{id}", web::get().to(super::jobs::get))
            .route("/jobs/{id}/cancel", web::post().to(super::jobs::cancel))
            .route("/jobs/{id}/brief", web::post().to(super::brief::generate))
            .route("/jobs/{id}/brief", web::get().to(super::brief::get)),
    );
    cfg.route("/ready", web::get().to(ready));
}
async fn ready(state: Option<web::Data<WorkspaceState>>) -> impl Responder {
    if let Some(s) = state {
        if sqlx::query("SELECT 1").execute(&s.pool).await.is_ok() {
            return HttpResponse::Ok().json(json!({"status":"ready","workspace_storage":"online"}));
        }
    }
    HttpResponse::ServiceUnavailable()
        .json(json!({"status":"not_ready","workspace_storage":"offline"}))
}
async fn context(s: web::Data<WorkspaceState>, a: Actor) -> Result<HttpResponse, AppError> {
    let workspaces:Vec<(Uuid,String,String)>=sqlx::query_as("SELECT w.id,w.name,m.role FROM platform_memberships m JOIN platform_workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 ORDER BY w.name").bind(a.user_id).fetch_all(&s.pool).await?;
    Ok(HttpResponse::Ok().json(json!({"actor":a,"workspaces":workspaces.into_iter().map(|(id,name,role)|json!({"id":id,"name":name,"role":role})).collect::<Vec<_>>()})))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Switch {
    workspace_id: Uuid,
}
async fn switch_context(
    s: web::Data<WorkspaceState>,
    a: Actor,
    input: web::Json<Switch>,
) -> Result<HttpResponse, AppError> {
    let mut tx = s.pool.begin().await?;
    let allowed =
        sqlx::query("SELECT 1 FROM platform_memberships WHERE workspace_id=$1 AND user_id=$2")
            .bind(input.workspace_id)
            .bind(a.user_id)
            .fetch_optional(&mut *tx)
            .await?
            .is_some();
    if !allowed {
        audit(
            &mut tx,
            &a,
            Some(input.workspace_id),
            "workspace.switch",
            false,
            "no membership in requested workspace",
        )
        .await?;
        tx.commit().await?;
        return Err(AppError::Forbidden);
    }
    sqlx::query("UPDATE platform_user_context SET workspace_id=$1 WHERE user_id=$2")
        .bind(input.workspace_id)
        .bind(a.user_id)
        .execute(&mut *tx)
        .await?;
    audit(
        &mut tx,
        &a,
        Some(input.workspace_id),
        "workspace.switch",
        true,
        "membership verified",
    )
    .await?;
    tx.commit().await?;
    Ok(HttpResponse::Ok().json(json!({"workspace_id":input.workspace_id})))
}
#[derive(Serialize, FromRow)]
struct BomSummary {
    id: Uuid,
    name: String,
    revision: i64,
    item_count: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
async fn list(
    s: web::Data<WorkspaceState>,
    a: Actor,
    page: web::Query<Page>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Read, None).await?;
    let boms = sqlx::query_as::<_, BomSummary>(
        "SELECT id,name,revision,jsonb_array_length(items)::int AS item_count,created_at,updated_at FROM platform_boms WHERE workspace_id=$1 ORDER BY updated_at DESC,id DESC LIMIT 50 OFFSET $2",
    )
    .bind(a.workspace_id)
    .bind(page.offset()?)
    .fetch_all(&s.pool)
    .await?;
    let mut tx = s.pool.begin().await?;
    audit(
        &mut tx,
        &a,
        None,
        "bom.list",
        true,
        "workspace-scoped query",
    )
    .await?;
    tx.commit().await?;
    Ok(HttpResponse::Ok().json(boms))
}
async fn create(
    s: web::Data<WorkspaceState>,
    a: Actor,
    input: web::Json<BomInput>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Write, None).await?;
    let items = input.validate()?;
    let id = Uuid::new_v4();
    let mut tx = s.pool.begin().await?;
    let bom=sqlx::query_as::<_,Bom>("INSERT INTO platform_boms(id,workspace_id,created_by,name,items) VALUES($1,$2,$3,$4,$5) RETURNING *").bind(id).bind(a.workspace_id).bind(a.user_id).bind(input.name.trim()).bind(sqlx::types::Json(items)).fetch_one(&mut *tx).await?;
    audit(
        &mut tx,
        &a,
        Some(id),
        "bom.create",
        true,
        "BOM and audit record committed atomically",
    )
    .await?;
    tx.commit().await?;
    Ok(HttpResponse::Created().json(bom))
}
async fn get(
    s: web::Data<WorkspaceState>,
    a: Actor,
    id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Read, Some(*id)).await?;
    let bom =
        sqlx::query_as::<_, Bom>("SELECT * FROM platform_boms WHERE workspace_id=$1 AND id=$2")
            .bind(a.workspace_id)
            .bind(*id)
            .fetch_optional(&s.pool)
            .await?;
    let Some(bom) = bom else {
        return Err(a.missing(&s, *id, "bom.read").await?);
    };
    let mut tx = s.pool.begin().await?;
    audit(
        &mut tx,
        &a,
        Some(*id),
        "bom.read",
        true,
        "workspace and role verified",
    )
    .await?;
    tx.commit().await?;
    Ok(HttpResponse::Ok().json(bom))
}
async fn update(
    s: web::Data<WorkspaceState>,
    a: Actor,
    id: web::Path<Uuid>,
    input: web::Json<BomInput>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Write, Some(*id)).await?;
    let items = input.validate()?;
    let revision = input
        .revision
        .filter(|r| *r > 0)
        .ok_or_else(|| AppError::Invalid("Current revision is required for updates".into()))?;
    let mut tx = s.pool.begin().await?;
    let bom=sqlx::query_as::<_,Bom>("UPDATE platform_boms SET name=$1,items=$2,revision=revision+1,updated_at=now() WHERE workspace_id=$3 AND id=$4 AND revision=$5 RETURNING *").bind(input.name.trim()).bind(sqlx::types::Json(items)).bind(a.workspace_id).bind(*id).bind(revision).fetch_optional(&mut *tx).await?;
    if let Some(bom) = bom {
        audit(
            &mut tx,
            &a,
            Some(*id),
            "bom.update",
            true,
            "optimistic revision check passed",
        )
        .await?;
        tx.commit().await?;
        return Ok(HttpResponse::Ok().json(bom));
    }
    let exists = sqlx::query("SELECT 1 FROM platform_boms WHERE workspace_id=$1 AND id=$2")
        .bind(a.workspace_id)
        .bind(*id)
        .fetch_optional(&mut *tx)
        .await?
        .is_some();
    audit(
        &mut tx,
        &a,
        Some(*id),
        "bom.update",
        false,
        if exists {
            "stale revision"
        } else {
            "resource not found in active workspace"
        },
    )
    .await?;
    tx.commit().await?;
    Err(if exists {
        AppError::Conflict
    } else {
        AppError::NotFound
    })
}
async fn members(s: web::Data<WorkspaceState>, a: Actor) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::ManageTenant, None).await?;
    let rows: Vec<(Uuid, String)> = sqlx::query_as(
        "SELECT user_id,role FROM platform_memberships WHERE workspace_id=$1 ORDER BY user_id LIMIT 100",
    )
    .bind(a.workspace_id)
    .fetch_all(&s.pool)
    .await?;
    Ok(HttpResponse::Ok().json(
        rows.into_iter()
            .map(|(user_id, role)| json!({"user_id":user_id,"role":role}))
            .collect::<Vec<_>>(),
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Membership {
    role: String,
}
async fn set_member(
    s: web::Data<WorkspaceState>,
    a: Actor,
    id: web::Path<Uuid>,
    input: web::Json<Membership>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::ManageTenant, Some(*id)).await?;
    if *id == a.user_id || !matches!(input.role.as_str(), "design_engineer" | "viewer") {
        return Err(AppError::Invalid(
            "Choose another registered user and an engineer or viewer role".into(),
        ));
    }
    let mut tx = s.pool.begin().await?;
    let exists = sqlx::query("SELECT 1 FROM platform_user_context WHERE user_id=$1")
        .bind(*id)
        .fetch_optional(&mut *tx)
        .await?
        .is_some();
    if !exists {
        return Err(AppError::Invalid(
            "User must sign in once before being added".into(),
        ));
    }
    sqlx::query("INSERT INTO platform_memberships(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role").bind(a.workspace_id).bind(*id).bind(&input.role).execute(&mut *tx).await?;
    audit(
        &mut tx,
        &a,
        Some(*id),
        "membership.update",
        true,
        &format!("assigned {}", input.role),
    )
    .await?;
    tx.commit().await?;
    Ok(HttpResponse::Ok().json(json!({"user_id":*id,"role":input.role})))
}
#[derive(Serialize, FromRow)]
struct AuditRecord {
    id: Uuid,
    actor_id: Uuid,
    resource_id: Option<Uuid>,
    action: String,
    decision: String,
    reason: String,
    request_id: Uuid,
    created_at: DateTime<Utc>,
}
async fn audit_events(
    s: web::Data<WorkspaceState>,
    a: Actor,
    page: web::Query<Page>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::ManageTenant, None).await?;
    let events=sqlx::query_as::<_,AuditRecord>("SELECT id,actor_id,resource_id,action,decision,reason,request_id,created_at FROM platform_audit WHERE workspace_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $2").bind(a.workspace_id).bind(page.offset()?).fetch_all(&s.pool).await?;
    Ok(HttpResponse::Ok().json(events))
}
pub fn request_key(req: &HttpRequest) -> Result<Uuid, AppError> {
    req.headers()
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| Uuid::parse_str(v).ok())
        .ok_or_else(|| AppError::Invalid("Idempotency-Key must be a UUID".into()))
}
