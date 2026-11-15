//! Persistent, bounded enrichment workers. SQL leases are fenced by a unique token;
//! retries and cancellation survive a process restart. No in-memory work queue.
use super::*;
use actix_web::HttpRequest;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use tracing::Instrument;
#[derive(Clone, Serialize, FromRow)]
pub struct Job {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub actor_id: Uuid,
    pub bom_id: Uuid,
    pub bom_revision: i64,
    #[serde(skip_serializing)]
    pub items: sqlx::types::Json<Vec<BomItem>>,
    pub state: String,
    pub attempt: i32,
    pub max_attempts: i32,
    pub progress: i32,
    pub total: i32,
    pub result: Option<sqlx::types::Json<Value>>,
    pub error: Option<String>,
    #[serde(skip_serializing)]
    pub lease_token: Option<Uuid>,
    pub lease_until: Option<DateTime<Utc>>,
    pub available_at: DateTime<Utc>,
    pub request_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Submit {
    bom_id: Uuid,
    revision: i64,
}
pub async fn submit(
    s: web::Data<WorkspaceState>,
    a: Actor,
    req: HttpRequest,
    input: web::Json<Submit>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Write, Some(input.bom_id)).await?;
    let key = super::routes::request_key(&req)?;
    let mut tx = s.pool.begin().await?;
    // Serializing submission within a workspace provides an atomic capacity check.
    sqlx::query("SELECT id FROM platform_workspaces WHERE id=$1 FOR UPDATE")
        .bind(a.workspace_id)
        .execute(&mut *tx)
        .await?;
    if let Some(existing) = sqlx::query_as::<_, Job>(
        "SELECT * FROM platform_jobs WHERE workspace_id=$1 AND idempotency_key=$2",
    )
    .bind(a.workspace_id)
    .bind(key)
    .fetch_optional(&mut *tx)
    .await?
    {
        if existing.bom_id != input.bom_id || existing.bom_revision != input.revision {
            return Err(AppError::Conflict);
        }
        tx.commit().await?;
        return Ok(HttpResponse::Accepted().json(existing));
    }
    let pending:i64=sqlx::query_scalar("SELECT count(*) FROM platform_jobs WHERE workspace_id=$1 AND state IN ('queued','running','retry_wait')").bind(a.workspace_id).fetch_one(&mut *tx).await?;
    if pending >= 20 {
        return Err(AppError::QueueFull);
    }

    let bom = sqlx::query_as::<_, Bom>(
        "SELECT * FROM platform_boms WHERE workspace_id=$1 AND id=$2 FOR SHARE",
    )
    .bind(a.workspace_id)
    .bind(input.bom_id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some(bom) = bom else {
        audit(
            &mut tx,
            &a,
            Some(input.bom_id),
            "job.submit",
            false,
            "resource not found in active workspace",
        )
        .await?;
        tx.commit().await?;
        return Err(AppError::NotFound);
    };
    if bom.revision != input.revision {
        return Err(AppError::Conflict);
    }
    let job=sqlx::query_as::<_,Job>("INSERT INTO platform_jobs(id,workspace_id,actor_id,bom_id,bom_revision,items,total,request_id,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(workspace_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *").bind(Uuid::new_v4()).bind(a.workspace_id).bind(a.user_id).bind(bom.id).bind(bom.revision).bind(&bom.items).bind(bom.items.len() as i32).bind(a.request_id).bind(key).fetch_one(&mut *tx).await?;
    if job.bom_id != bom.id || job.bom_revision != bom.revision {
        return Err(AppError::Conflict);
    }
    audit(
        &mut tx,
        &a,
        Some(job.id),
        "job.submit",
        true,
        "durable snapshot queued; retries use the same idempotency key",
    )
    .await?;
    tx.commit().await?;
    Ok(HttpResponse::Accepted().json(job))
}
#[derive(Serialize, FromRow)]
struct JobSummary {
    id: Uuid,
    bom_id: Uuid,
    bom_revision: i64,
    state: String,
    attempt: i32,
    max_attempts: i32,
    progress: i32,
    total: i32,
    error: Option<String>,
    request_id: Uuid,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    has_result: bool,
}
pub async fn list(s: web::Data<WorkspaceState>, a: Actor) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Read, None).await?;
    Ok(HttpResponse::Ok().json(
        sqlx::query_as::<_, JobSummary>(
            "SELECT id,bom_id,bom_revision,state,attempt,max_attempts,progress,total,error,request_id,created_at,updated_at,result IS NOT NULL AS has_result FROM platform_jobs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50",
        )
        .bind(a.workspace_id)
        .fetch_all(&s.pool)
        .await?,
    ))
}
pub async fn get(
    s: web::Data<WorkspaceState>,
    a: Actor,
    id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Read, Some(*id)).await?;
    let job =
        sqlx::query_as::<_, Job>("SELECT * FROM platform_jobs WHERE workspace_id=$1 AND id=$2")
            .bind(a.workspace_id)
            .bind(*id)
            .fetch_optional(&s.pool)
            .await?;
    match job {
        Some(job) => Ok(HttpResponse::Ok().json(job)),
        None => Err(a.missing(&s, *id, "job.read").await?),
    }
}
pub async fn cancel(
    s: web::Data<WorkspaceState>,
    a: Actor,
    id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    a.require(&s, Action::Write, Some(*id)).await?;
    let mut tx = s.pool.begin().await?;
    let job=sqlx::query_as::<_,Job>("UPDATE platform_jobs SET state='cancelled',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE workspace_id=$1 AND id=$2 AND state IN ('queued','running','retry_wait') RETURNING *").bind(a.workspace_id).bind(*id).fetch_optional(&mut *tx).await?;
    if let Some(job) = job {
        audit(
            &mut tx,
            &a,
            Some(*id),
            "job.cancel",
            true,
            "worker lease revoked",
        )
        .await?;
        tx.commit().await?;
        return Ok(HttpResponse::Ok().json(job));
    }
    let exists = sqlx::query("SELECT 1 FROM platform_jobs WHERE workspace_id=$1 AND id=$2")
        .bind(a.workspace_id)
        .bind(*id)
        .fetch_optional(&mut *tx)
        .await?
        .is_some();
    audit(
        &mut tx,
        &a,
        Some(*id),
        "job.cancel",
        false,
        if exists {
            "job is already terminal"
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
pub async fn claim(pool: &PgPool) -> Result<Option<Job>, sqlx::Error> {
    sqlx::query("UPDATE platform_jobs SET state='failed',error='Worker lease expired after maximum attempts',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE state='running' AND lease_until<now() AND attempt>=max_attempts").execute(pool).await?;
    sqlx::query_as::<_,Job>("WITH candidate AS (SELECT id FROM platform_jobs WHERE ((state IN ('queued','retry_wait') AND available_at<=now()) OR (state='running' AND lease_until<now())) AND attempt<max_attempts ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE platform_jobs j SET state='running',attempt=attempt+1,error=NULL,lease_token=$1,lease_until=now()+interval '30 seconds',updated_at=now() FROM candidate c WHERE j.id=c.id RETURNING j.*").bind(Uuid::new_v4()).fetch_optional(pool).await
}
pub fn start_workers(state: WorkspaceState) -> Vec<tokio::task::JoinHandle<()>> {
    let mut tasks = Vec::new();
    for worker in 0..2 {
        let state = state.clone();
        tasks.push(tokio::spawn(async move {
            loop {
                match claim(&state.pool).await {
                    Ok(Some(job)) => {
                        let span = tracing::info_span!("enrichment_job", job_id=%job.id, request_id=%job.request_id, worker);
                        process(&state, &job).instrument(span).await;
                    }
                    Ok(None) => tokio::time::sleep(Duration::from_millis(500)).await,
                    Err(_) => {
                        tracing::error!(worker, "job claim failed");
                        tokio::time::sleep(Duration::from_secs(2)).await;
                    }
                }
            }
        }));
    }
    tasks.push(tokio::spawn(async move {
        loop {
            if let Ok(counts) = sqlx::query_as::<_, (String, i64)>("SELECT state,count(*) FROM platform_jobs WHERE state IN ('queued','running','retry_wait') GROUP BY state").fetch_all(&state.pool).await {
                for name in ["queued", "running", "retry_wait"] {
                    let count = counts.iter().find(|(state, _)|state==name).map(|(_, count)|*count).unwrap_or(0);
                    metrics::gauge!("workspace_jobs", "state"=>name).set(count as f64);
                }
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    }));
    tasks
}
async fn permitted(s: &WorkspaceState, j: &Job) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("SELECT 1 FROM platform_memberships WHERE workspace_id=$1 AND user_id=$2 AND role IN ('owner','design_engineer')").bind(j.workspace_id).bind(j.actor_id).fetch_optional(&s.pool).await?.is_some())
}
pub async fn checkpoint(
    pool: &PgPool,
    j: &Job,
    progress: i32,
    result: &Value,
) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE platform_jobs SET progress=$1,result=$2,lease_until=now()+interval '30 seconds',updated_at=now() WHERE id=$3 AND state='running' AND lease_token=$4 AND lease_until>now()").bind(progress).bind(result).bind(j.id).bind(j.lease_token).execute(pool).await?.rows_affected()==1)
}
pub async fn finish(pool: &PgPool, j: &Job, result: &Value) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("UPDATE platform_jobs SET state='completed',progress=total,result=$1,error=NULL,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$2 AND state='running' AND lease_token=$3 AND lease_until>now()").bind(result).bind(j.id).bind(j.lease_token).execute(pool).await?.rows_affected()==1)
}
pub async fn fail(
    pool: &PgPool,
    j: &Job,
    message: &str,
    retryable: bool,
) -> Result<(), sqlx::Error> {
    let retry = retryable && j.attempt < j.max_attempts;
    sqlx::query("UPDATE platform_jobs SET state=$1,error=$2,available_at=now()+($3*interval '1 second'),lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$4 AND state='running' AND lease_token=$5 AND lease_until>now()").bind(if retry{"retry_wait"}else{"failed"}).bind(message).bind(2_i32.pow(j.attempt as u32).min(60)).bind(j.id).bind(j.lease_token).execute(pool).await?;
    metrics::counter!("workspace_job_attempts_total","outcome"=>if retry{"retry"}else{"failed"})
        .increment(1);
    Ok(())
}
async fn process(s: &WorkspaceState, j: &Job) {
    let started = std::time::Instant::now();
    tracing::info!(attempt = j.attempt, "job started");
    if let Err((message, retryable)) = run(s, j).await {
        let _ = fail(&s.pool, j, &message, retryable).await;
        tracing::warn!(retryable,error=%message,"job attempt stopped");
    }
    metrics::histogram!("workspace_job_duration_seconds").record(started.elapsed().as_secs_f64());
}
async fn run(s: &WorkspaceState, j: &Job) -> Result<(), (String, bool)> {
    let mut groups: BTreeMap<u32, Vec<String>> = BTreeMap::new();
    for item in j.items.iter() {
        groups
            .entry(item.quantity)
            .or_default()
            .push(item.part_number.clone());
    }
    let mut results = j
        .result
        .as_ref()
        .and_then(|r| r.0.get("results"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut progress = j.progress;
    if results.len() != progress as usize {
        return Err(("Stored checkpoint is inconsistent".into(), false));
    }
    let mut offset = 0;
    for (quantity, mpns) in groups {
        for batch in mpns.chunks(25) {
            let end = offset + batch.len() as i32;
            if end <= progress {
                offset = end;
                continue;
            }
            if offset != progress {
                return Err(("Stored checkpoint is not at a batch boundary".into(), false));
            }
            offset = end;
            if !permitted(s, j)
                .await
                .map_err(|_| ("Membership lookup unavailable".into(), true))?
            {
                return Err((
                    "Submitting user's write permission was revoked".into(),
                    false,
                ));
            }
            if !checkpoint(&s.pool, j, progress, &json!({"results":results}))
                .await
                .map_err(|_| ("Storage unavailable".into(), true))?
            {
                return Ok(());
            }
            let response = s
                .client
                .post(format!("{}/api/v1/ingest/enrich-batch", s.ingest_url))
                .header("X-Request-ID", j.request_id.to_string())
                .json(&json!({"mpns":batch,"target_batch_size":quantity}))
                .send()
                .await
                .map_err(|_| ("Supplier service unavailable or timed out".into(), true))?;
            if !response.status().is_success() {
                return Err((
                    format!("Supplier service returned {}", response.status().as_u16()),
                    response.status().is_server_error() || response.status().as_u16() == 429,
                ));
            }
            let body: Value = response
                .json()
                .await
                .map_err(|_| ("Supplier response was not valid JSON".into(), true))?;
            let rows = body
                .get("results")
                .and_then(Value::as_array)
                .filter(|rows| rows.len() == batch.len())
                .ok_or_else(|| ("Supplier response has an unexpected row count".into(), true))?;
            for (row, mpn) in rows.iter().zip(batch) {
                if row["query_mpn"].as_str() != Some(mpn.as_str()) {
                    return Err(("Supplier response part order mismatch".into(), true));
                }
                let mut row = row.clone();
                row["required_quantity"] = json!(quantity);
                results.push(row);
            }
            progress += batch.len() as i32;
            if !checkpoint(&s.pool, j, progress, &json!({"results":results}))
                .await
                .map_err(|_| ("Storage unavailable".into(), true))?
            {
                return Ok(());
            }
        }
    }
    if finish(
        &s.pool,
        j,
        &json!({"results":results,"bom_revision":j.bom_revision}),
    )
    .await
    .map_err(|_| ("Storage unavailable".into(), true))?
    {
        metrics::counter!("workspace_job_attempts_total","outcome"=>"completed").increment(1);
        tracing::info!("job completed");
    }
    Ok(())
}
