//! Tenant-owned application services. Identity is verified at the HTTP boundary;
//! repositories always bind the active workspace, independently of policy evaluation.
pub mod auth;
pub mod brief;
pub mod jobs;
mod routes;
use crate::authz::{
    Action, Context, Decision, PolicyEngine, PolicyRule, PolicySet, Resource, RuleEffect,
    SensitivityLevel, Subject,
};
use actix_web::{http::StatusCode, web, HttpResponse, ResponseError};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, FromRow, PgPool, Postgres, Transaction};
use std::{collections::HashMap, sync::Arc, time::Duration};
use uuid::Uuid;

#[derive(Clone)]
pub struct WorkspaceState {
    pub pool: PgPool,
    pub verifier: auth::AssertionVerifier,
    pub policies: Arc<PolicyEngine>,
    pub ingest_url: String,
    pub client: reqwest::Client,
    pub model_enabled: bool,
}
impl WorkspaceState {
    pub async fn connect(url: &str, secret: &str, ingest_url: String) -> Result<Self, AppError> {
        let verifier = auth::AssertionVerifier::new(secret)?;
        let pool = PgPoolOptions::new()
            .max_connections(8)
            .acquire_timeout(Duration::from_secs(5))
            .connect(url)
            .await?;
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .map_err(|_| AppError::Unavailable)?;
        Ok(Self {
            model_enabled: std::env::var("NEXUS_AI_ENABLED").as_deref() == Ok("true"),
            pool,
            verifier,
            policies: Arc::new(PolicyEngine::new(workspace_policies())),
            ingest_url,
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .map_err(|_| AppError::Unavailable)?,
        })
    }
}
pub fn workspace_policies() -> PolicySet {
    let rule = |id: &str, roles: Vec<&str>, actions: Vec<Action>| PolicyRule {
        id: id.into(),
        name: id.into(),
        description: "Workspace-scoped permission; identity and role loaded from database".into(),
        effect: RuleEffect::Allow,
        allowed_roles: roles.into_iter().map(String::from).collect(),
        allowed_actions: actions,
        allowed_resource_types: vec!["bom".into()],
        max_sensitivity: SensitivityLevel::Confidential,
        require_nda: false,
        require_same_tenant: true,
    };
    PolicySet {
        version: 1,
        updated_at: Utc::now(),
        rules: vec![
            rule(
                "workspace-owner",
                vec!["owner"],
                vec![
                    Action::Read,
                    Action::Write,
                    Action::Delete,
                    Action::ManageTenant,
                ],
            ),
            rule(
                "workspace-engineer",
                vec!["design_engineer"],
                vec![Action::Read, Action::Write],
            ),
            rule("workspace-viewer", vec!["viewer"], vec![Action::Read]),
        ],
    }
}
#[derive(Clone, Debug, Serialize, FromRow)]
pub struct Actor {
    pub user_id: Uuid,
    pub workspace_id: Uuid,
    pub role: String,
    pub request_id: Uuid,
}
impl Actor {
    pub async fn require(
        &self,
        state: &WorkspaceState,
        action: Action,
        resource: Option<Uuid>,
    ) -> Result<(), AppError> {
        let tenant = self.workspace_id.to_string();
        let result = state.policies.evaluate(
            &Subject {
                user_id: self.user_id.to_string(),
                tenant_id: tenant.clone(),
                role: self.role.clone(),
                clearance: SensitivityLevel::Confidential,
                attributes: HashMap::new(),
            },
            &action,
            &Resource {
                resource_id: resource.unwrap_or(self.workspace_id).to_string(),
                resource_type: "bom".into(),
                tenant_id: tenant,
                sensitivity: SensitivityLevel::Confidential,
                attributes: HashMap::new(),
            },
            &Context::default(),
        );
        if result.decision == Decision::Allow {
            return Ok(());
        }
        let mut tx = state.pool.begin().await?;
        audit(
            &mut tx,
            self,
            resource,
            &format!("{action:?}"),
            false,
            "role does not permit this operation",
        )
        .await?;
        tx.commit().await?;
        Err(AppError::Forbidden)
    }
    pub async fn missing(
        &self,
        state: &WorkspaceState,
        resource: Uuid,
        action: &str,
    ) -> Result<AppError, AppError> {
        let mut tx = state.pool.begin().await?;
        audit(
            &mut tx,
            self,
            Some(resource),
            action,
            false,
            "resource not found in active workspace",
        )
        .await?;
        tx.commit().await?;
        Ok(AppError::NotFound)
    }
}
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Sign in to access this workspace")]
    Unauthorized,
    #[error("Your workspace role does not allow this operation")]
    Forbidden,
    #[error("Resource not found in your workspace")]
    NotFound,
    #[error("The record changed. Reload before saving")]
    Conflict,
    #[error("{0}")]
    Invalid(String),
    #[error("Workspace queue is full. Wait for a job to finish before submitting another")]
    QueueFull,
    #[error("Analysis quota reached. Try again in ten minutes")]
    RateLimited,
    #[error("Workspace storage is temporarily unavailable")]
    Unavailable,
}
impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        tracing::error!(code=?error.as_database_error().and_then(|e|e.code()),"workspace database operation failed");
        Self::Unavailable
    }
}
impl ResponseError for AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Conflict => StatusCode::CONFLICT,
            Self::QueueFull | Self::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            Self::Invalid(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
        }
    }
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(serde_json::json!({"error":self.to_string()}))
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BomItem {
    pub part_number: String,
    pub quantity: u32,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub manufacturer: String,
}
#[derive(Serialize, FromRow)]
pub struct Bom {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub created_by: Uuid,
    pub name: String,
    pub revision: i64,
    pub items: sqlx::types::Json<Vec<BomItem>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BomInput {
    pub name: String,
    pub items: Option<Vec<BomItem>>,
    pub raw_content: Option<String>,
    pub revision: Option<i64>,
}
impl BomInput {
    pub fn validate(&self) -> Result<Vec<BomItem>, AppError> {
        if self.name.trim().is_empty() || self.name.len() > 160 {
            return Err(AppError::Invalid(
                "Name must contain 1–160 characters".into(),
            ));
        }
        let items = match (&self.items, &self.raw_content) {
            (Some(items), None) => items.clone(),
            (None, Some(raw)) => {
                if raw.len() > 1_000_000 {
                    return Err(AppError::Invalid("BOM text exceeds 1MB".into()));
                }
                let parsed = crate::bom_engine::BomEngine::parse_bom_csv(raw);
                if parsed.error_lines > 0 {
                    return Err(AppError::Invalid(format!("{} invalid rows. Every row needs a part number and positive whole-number quantity",parsed.error_lines)));
                }
                parsed
                    .items
                    .into_iter()
                    .map(|p| BomItem {
                        part_number: p.raw_mpn,
                        quantity: p.quantity,
                        description: p.description,
                        manufacturer: p.manufacturer,
                    })
                    .collect()
            }
            _ => {
                return Err(AppError::Invalid(
                    "Provide either items or raw_content".into(),
                ))
            }
        };
        if items.is_empty() || items.len() > 500 {
            return Err(AppError::Invalid("Provide 1–500 BOM rows".into()));
        }
        if items.iter().any(|i| {
            i.part_number.trim().is_empty()
                || i.part_number.len() > 128
                || i.quantity == 0
                || i.description.len() > 2000
                || i.manufacturer.len() > 160
        }) {
            return Err(AppError::Invalid(
                "Invalid part number, quantity, or field length".into(),
            ));
        }
        Ok(items)
    }
}
pub async fn audit(
    tx: &mut Transaction<'_, Postgres>,
    actor: &Actor,
    resource: Option<Uuid>,
    action: &str,
    allow: bool,
    reason: &str,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO platform_audit(id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)").bind(Uuid::new_v4()).bind(actor.workspace_id).bind(actor.user_id).bind(resource).bind(action).bind(if allow{"allow"}else{"deny"}).bind(reason).bind(actor.request_id).execute(&mut **tx).await?;
    metrics::counter!("workspace_audit_events_total","decision"=>if allow{"allow"}else{"deny"})
        .increment(1);
    Ok(())
}
pub fn configure(cfg: &mut web::ServiceConfig) {
    routes::configure(cfg)
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Page {
    #[serde(default)]
    offset: i64,
}
impl Page {
    pub fn offset(&self) -> Result<i64, AppError> {
        if (0..=10000).contains(&self.offset) {
            Ok(self.offset)
        } else {
            Err(AppError::Invalid(
                "Offset must be between 0 and 10000".into(),
            ))
        }
    }
}
