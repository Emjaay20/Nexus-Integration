//! Actix-Web API Handlers and Routing for Luminovo Platform Core

use crate::agent_bridge::{AgentBridge, QueryProfileRequest, RuleValidationRequest};
use crate::ai_copilot::{AiCopilotEngine, AlternateMatchRequest, SourcingRiskRequest};
use crate::authz::{Action, Context, PolicyEngine, PolicySet, Resource, Subject};
use crate::bom_engine::BomEngine;
use crate::telemetry::render_metrics;
use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub struct AppState {
    pub policy_engine: Arc<PolicyEngine>,
    pub ai_copilot: Arc<AiCopilotEngine>,
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub active_policies: usize,
    pub timestamp: String,
}

#[derive(Deserialize)]
pub struct EvaluateRequest {
    pub subject: Subject,
    pub action: Action,
    pub resource: Resource,
    pub context: Option<Context>,
}

#[derive(Deserialize)]
pub struct BomParseRequest {
    pub raw_content: String,
}

pub async fn health_check(data: web::Data<AppState>) -> impl Responder {
    let policy_count = data.policy_engine.get_policies().rules.len();
    HttpResponse::Ok().json(HealthResponse {
        status: "healthy",
        service: "luminovo-platform-core",
        version: env!("CARGO_PKG_VERSION"),
        active_policies: policy_count,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

pub async fn metrics_handler() -> impl Responder {
    let body = render_metrics();
    HttpResponse::Ok()
        .content_type("text/plain; version=0.0.4; charset=utf-8")
        .body(body)
}

pub async fn evaluate_policy(
    data: web::Data<AppState>,
    req: web::Json<EvaluateRequest>,
) -> impl Responder {
    let ctx = req.context.clone().unwrap_or_default();
    let result = data
        .policy_engine
        .evaluate(&req.subject, &req.action, &req.resource, &ctx);

    metrics::counter!("authz_evaluations_total", "decision" => format!("{:?}", result.decision)).increment(1);
    metrics::histogram!("authz_evaluation_duration_nanos").record(result.latency_nanos as f64);

    HttpResponse::Ok().json(result)
}

pub async fn get_policies(data: web::Data<AppState>) -> impl Responder {
    let policies = data.policy_engine.get_policies();
    HttpResponse::Ok().json(policies)
}

pub async fn reload_policies(
    data: web::Data<AppState>,
    new_set: web::Json<PolicySet>,
) -> impl Responder {
    let new_version = data.policy_engine.reload_policies(new_set.into_inner());
    metrics::counter!("authz_policy_reloads_total").increment(1);

    HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Policy set atomically hot-reloaded across all worker threads",
        "new_version": new_version
    }))
}

pub async fn parse_bom(req: web::Json<BomParseRequest>) -> impl Responder {
    let summary = BomEngine::parse_bom_csv(&req.raw_content);
    metrics::counter!("bom_lines_processed_total").increment(summary.valid_lines as u64);

    HttpResponse::Ok().json(summary)
}

pub async fn analyze_sourcing_risk(
    data: web::Data<AppState>,
    req: web::Json<SourcingRiskRequest>,
) -> impl Responder {
    let report = data.ai_copilot.analyze_sourcing_risk(req.into_inner()).await;
    metrics::counter!("ai_sourcing_analyses_total").increment(1);

    HttpResponse::Ok().json(report)
}

pub async fn match_alternate_parts(
    data: web::Data<AppState>,
    req: web::Json<AlternateMatchRequest>,
) -> impl Responder {
    let res = data.ai_copilot.match_alternate_parts(req.into_inner()).await;
    metrics::counter!("ai_alternate_matches_total").increment(1);

    HttpResponse::Ok().json(res)
}

pub async fn validate_agent_rule(req: web::Json<RuleValidationRequest>) -> impl Responder {
    let res = AgentBridge::validate_policy_rule(&req.rule);
    HttpResponse::Ok().json(res)
}

pub async fn profile_agent_query(req: web::Json<QueryProfileRequest>) -> impl Responder {
    let res = AgentBridge::profile_sql_query(&req.sql_query);
    HttpResponse::Ok().json(res)
}
