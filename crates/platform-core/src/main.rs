//! Platform Core service
//!
//! actix-web service for electronics supply chain workflows: permission
//! evaluation, BOM parsing, sourcing risk analysis, policy/SQL checks for
//! developer tooling, and Prometheus metrics.

use actix_web::{middleware, web, App, HttpServer};
use nexus_platform_core::ai_copilot::AiCopilotEngine;
use nexus_platform_core::api::{self, AppState};
use nexus_platform_core::authz::{PolicyEngine, PolicySet};
use nexus_platform_core::{telemetry, workspace};
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
        "Starting Platform Core service"
    );

    // 2. Initialize Shared State with In-Memory Policy Decision Point (PDP)
    let policy_engine = Arc::new(PolicyEngine::new(PolicySet::default_policies()));
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

    tracing::info!(%bind_addr, "listening");

    let workspace_state = match (
        env::var("DATABASE_URL"),
        env::var("CORE_AUTH_SECRET")
            .or_else(|_| env::var("AUTH_SECRET"))
            .or_else(|_| env::var("NEXTAUTH_SECRET")),
    ) {
        (Ok(url), Ok(secret)) => match workspace::WorkspaceState::connect(
            &url,
            &secret,
            env::var("GO_INGEST_URL").unwrap_or_else(|_| "http://127.0.0.1:8090".into()),
        )
        .await
        {
            Ok(state) => Some(web::Data::new(state)),
            Err(_) => {
                tracing::error!(
                    "Workspace initialization failed; protected operations will fail closed"
                );
                None
            }
        },
        _ => {
            tracing::warn!("Workspace storage or signing secret not configured");
            None
        }
    };
    let workers = workspace_state
        .as_ref()
        .map(|s| workspace::jobs::start_workers(s.get_ref().clone()))
        .unwrap_or_default();

    // 3. Start Actix-Web HTTP Server
    let result = HttpServer::new(move || {
        let mut app = App::new();
        if let Some(state) = &workspace_state {
            app = app.app_data(state.clone());
        }
        app.configure(workspace::configure)
            .wrap(telemetry::RequestTelemetry)
            .app_data(app_state.clone())
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            // System endpoints
            .route("/health", web::get().to(api::health_check))
            .route("/metrics", web::get().to(api::metrics_handler))
            // Authz / Permission Engine
            .route(
                "/api/v1/authz/evaluate",
                web::post().to(api::evaluate_policy),
            )
            .route("/api/v1/authz/policies", web::get().to(api::get_policies))
            .route(
                "/api/v1/authz/policies",
                web::put().to(api::reload_policies),
            )
            // BOM Streaming & Ingestion
            .route("/api/v1/bom/parse", web::post().to(api::parse_bom))
            // AI Sourcing Copilot
            .route(
                "/api/v1/ai/sourcing-risk",
                web::post().to(api::analyze_sourcing_risk),
            )
            .route(
                "/api/v1/ai/match-alternate",
                web::post().to(api::match_alternate_parts),
            )
            // Developer Agent Bridge (MCP)
            .route(
                "/api/v1/agent/validate-rule",
                web::post().to(api::validate_agent_rule),
            )
            .route(
                "/api/v1/agent/profile-query",
                web::post().to(api::profile_agent_query),
            )
            // ML Risk Inference & Semantic Vector Search
            .route(
                "/api/v1/ml/predict-risk",
                web::post().to(api::ml_predict_risk),
            )
            .route(
                "/api/v1/ml/semantic-search",
                web::post().to(api::semantic_part_search),
            )
            // Polyglot Rust <-> Go Distributor Enrichment Bridge
            .route(
                "/api/v1/bom/enrich",
                web::post().to(api::polyglot_bom_enrich),
            )
    })
    .shutdown_timeout(10)
    .bind(&bind_addr)?
    .run()
    .await;
    for worker in workers {
        worker.abort();
    }
    nexus_platform_core::telemetry::shutdown_traces();
    result
}
