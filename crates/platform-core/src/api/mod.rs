//! Actix-Web API Handlers and Routing for Platform Core

use crate::agent_bridge::{AgentBridge, QueryProfileRequest, RuleValidationRequest};
use crate::ai_copilot::{AiCopilotEngine, AlternateMatchRequest, SourcingRiskRequest};
use crate::authz::{Action, Context, PolicyEngine, PolicySet, Resource, Subject};
use crate::bom_engine::BomEngine;
use crate::ml_engine::{
    MlComponentFeatures, MlPartRiskPrediction, MlRiskEngine, SemanticSearchMatch,
};
use crate::telemetry::render_metrics;
use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::env;
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
        service: "nexus-platform-core",
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

    metrics::counter!("authz_evaluations_total", "decision" => format!("{:?}", result.decision))
        .increment(1);
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
    let report = data
        .ai_copilot
        .analyze_sourcing_risk(req.into_inner())
        .await;
    metrics::counter!("ai_sourcing_analyses_total").increment(1);

    HttpResponse::Ok().json(report)
}

pub async fn match_alternate_parts(
    data: web::Data<AppState>,
    req: web::Json<AlternateMatchRequest>,
) -> impl Responder {
    let res = data
        .ai_copilot
        .match_alternate_parts(req.into_inner())
        .await;
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

#[derive(Deserialize)]
pub struct MlPredictRequest {
    pub components: Vec<MlComponentFeatures>,
}

#[derive(Serialize)]
pub struct MlPredictResponse {
    pub predictions: Vec<MlPartRiskPrediction>,
    pub model_version: &'static str,
}

pub async fn ml_predict_risk(req: web::Json<MlPredictRequest>) -> impl Responder {
    let predictions: Vec<MlPartRiskPrediction> = req
        .components
        .iter()
        .map(MlRiskEngine::predict_component_risk)
        .collect();
    metrics::counter!("ml_risk_predictions_total").increment(predictions.len() as u64);

    HttpResponse::Ok().json(MlPredictResponse {
        predictions,
        model_version: "nexus-heuristic-risk-v1",
    })
}

#[derive(Deserialize)]
pub struct SemanticSearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
}

#[derive(Serialize)]
pub struct SemanticSearchResponse {
    pub query: String,
    pub dimensions: usize,
    pub matches: Vec<SemanticSearchMatch>,
}

pub async fn semantic_part_search(req: web::Json<SemanticSearchRequest>) -> impl Responder {
    let top_k = req.top_k.unwrap_or(4);
    let matches = MlRiskEngine::semantic_search(&req.query, top_k);
    metrics::counter!("semantic_vector_searches_total").increment(1);

    HttpResponse::Ok().json(SemanticSearchResponse {
        query: req.query.clone(),
        dimensions: 32,
        matches,
    })
}

#[derive(Deserialize)]
pub struct PolyglotEnrichRequest {
    pub mpns: Vec<String>,
    pub target_batch_size: Option<u32>,
}

pub async fn polyglot_bom_enrich(req: web::Json<PolyglotEnrichRequest>) -> impl Responder {
    let go_url = env::var("GO_INGEST_URL").unwrap_or_else(|_| "http://127.0.0.1:8090".to_string());
    if req.mpns.is_empty()
        || req.mpns.len() > 500
        || req
            .mpns
            .iter()
            .any(|m| m.trim().is_empty() || m.len() > 128)
    {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "Provide 1–500 part numbers, each at most 128 characters."}));
    }
    let batch_size = req.target_batch_size.unwrap_or(500);
    if batch_size == 0 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Quantity must be positive."}));
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .unwrap_or_default();

    let payload = serde_json::json!({
        "mpns": req.mpns,
        "target_batch_size": batch_size,
    });

    match client
        .post(format!("{}/api/v1/ingest/enrich-batch", go_url))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(mut body) = resp.json::<serde_json::Value>().await {
                if let Some(results) = body.get_mut("results").and_then(|v| v.as_array_mut()) {
                    for item in results.iter_mut() {
                        if item["distributor_count"].as_u64().unwrap_or(0) == 0
                            || (item["data_source"] == "live"
                                && item["max_lead_time_weeks"].as_u64().unwrap_or(0) == 0)
                        {
                            item["ml_risk_prediction"] = serde_json::Value::Null;
                            continue;
                        }
                        let mpn = item["normalized_mpn"].as_str().unwrap_or("").to_string();
                        let mfr = item["manufacturer"].as_str().unwrap_or("").to_string();
                        let cat = item["category"].as_str().unwrap_or("").to_string();
                        let pkg = item["package"].as_str().unwrap_or("").to_string();
                        let desc = item["description"].as_str().unwrap_or("").to_string();
                        let lead = item["max_lead_time_weeks"].as_u64().unwrap_or(6) as u32;
                        let stock = item["total_stock"].as_u64().unwrap_or(0);
                        let dist_cnt = item["distributor_count"].as_u64().unwrap_or(1) as u32;
                        let lc = item["lifecycle_status"]
                            .as_str()
                            .unwrap_or("Active")
                            .to_string();
                        let price = item["best_unit_price_at_qty"].as_f64().unwrap_or(0.5);

                        let pred = MlRiskEngine::predict_component_risk(&MlComponentFeatures {
                            mpn,
                            manufacturer: mfr,
                            category: cat,
                            package: pkg,
                            description: desc,
                            lead_time_weeks: lead,
                            stock_qty: stock,
                            required_qty: batch_size as u64,
                            distributor_count: dist_cnt,
                            lifecycle_status: lc,
                            unit_price_usd: price,
                        });
                        item["ml_risk_prediction"] = serde_json::to_value(pred).unwrap_or_default();
                    }
                }
                metrics::counter!("polyglot_ingest_batches_total").increment(1);
                return HttpResponse::Ok().json(body);
            }
        }
        _ => {}
    }

    HttpResponse::ServiceUnavailable().json(serde_json::json!({
        "error": "Distributor service unavailable. No stock or pricing can be verified. Please retry.",
        "results": []
    }))
}
