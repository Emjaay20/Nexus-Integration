//! Luminovo Platform Core Monolith
//!
//! High-performance platform engine built with actix-web for the electronics supply chain.
//! Incorporates the ABAC Permissions Engine, Streaming BOM Ingestion, AI Sourcing Copilot,
//! OpenTelemetry/Prometheus observability, and the Developer Agent MCP Bridge.

use actix_web::{middleware, web, App, HttpServer};
use luminovo_platform_core::ai_copilot::AiCopilotEngine;
use luminovo_platform_core::api::{self, AppState};
use luminovo_platform_core::authz::{PolicyEngine, PolicySet};
use luminovo_platform_core::telemetry;
use std::env;
use std::sync::Arc;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 1. Initialize Distributed Tracing & Prometheus Telemetry
    if let Err(e) = telemetry::init_telemetry() {
        eprintln!("Failed to initialize telemetry: {}", e);
    }

    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        "Starting Luminovo Platform Core Service"
    );

    // 2. Initialize Shared State with In-Memory Policy Decision Point (PDP)
    let policy_engine = Arc::new(PolicyEngine::new(PolicySet::default_luminovo_policies()));
    let ai_copilot = Arc::new(AiCopilotEngine::new());

    let app_state = web::Data::new(AppState {
        policy_engine,
        ai_copilot,
    });

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let bind_addr = format!("{}:{}", host, port);

    println!(
        r#"
========================================================================
   __   _   _ __  __ ___ _  _  _____   _____    ___ ___  ___ ___ 
  / /  | | | |  \/  |_ _| \| |/ _ \ \ / / _ \  / __/ _ \| _ \ __|
 / /   | |_| | |\/| || || .` | (_) \ V / (_) || (_| (_) |   / _| 
/_/     \___/|_|  |_|___|_|\_|\___/ \_/ \___/  \___\___/|_|_\___|
  Luminovo Team Core - Senior/Staff Platform Engine
========================================================================
 Listening on: http://{}
 Health check: http://{}/health
 Metrics:      http://{}/metrics
 Policies:     http://{}/api/v1/authz/policies
========================================================================
"#,
        bind_addr, bind_addr, bind_addr, bind_addr
    );

    // 3. Start Actix-Web HTTP Server
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            // System endpoints
            .route("/health", web::get().to(api::health_check))
            .route("/metrics", web::get().to(api::metrics_handler))
            // Authz / Permission Engine
            .route("/api/v1/authz/evaluate", web::post().to(api::evaluate_policy))
            .route("/api/v1/authz/policies", web::get().to(api::get_policies))
            .route("/api/v1/authz/policies", web::put().to(api::reload_policies))
            // BOM Streaming & Ingestion
            .route("/api/v1/bom/parse", web::post().to(api::parse_bom))
            // AI Sourcing Copilot
            .route("/api/v1/ai/sourcing-risk", web::post().to(api::analyze_sourcing_risk))
            .route("/api/v1/ai/match-alternate", web::post().to(api::match_alternate_parts))
            // Developer Agent Bridge (MCP)
            .route("/api/v1/agent/validate-rule", web::post().to(api::validate_agent_rule))
            .route("/api/v1/agent/profile-query", web::post().to(api::profile_agent_query))
    })
    .bind(&bind_addr)?
    .run()
    .await
}
