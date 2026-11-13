//! End-to-End Integration Tests for the Platform Core HTTP API

use actix_web::{test, web, App};
use nexus_platform_core::ai_copilot::AiCopilotEngine;
use nexus_platform_core::api::{self, AppState};
use nexus_platform_core::authz::{PolicyEngine, PolicySet};
use serde_json::json;
use std::sync::Arc;

fn create_test_state() -> web::Data<AppState> {
    let policy_engine = Arc::new(PolicyEngine::new(PolicySet::default_policies()));
    let ai_copilot = Arc::new(AiCopilotEngine::new());
    web::Data::new(AppState {
        policy_engine,
        ai_copilot,
    })
}

#[actix_rt::test]
async fn test_health_check_endpoint() {
    let app_state = create_test_state();
    let app = test::init_service(
        App::new()
            .app_data(app_state)
            .route("/health", web::get().to(api::health_check)),
    )
    .await;

    let req = test::TestRequest::get().uri("/health").to_request();
    let resp: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(resp["status"], "healthy");
    assert_eq!(resp["service"], "nexus-platform-core");
    assert!(resp["active_policies"].as_u64().unwrap() >= 4);
}

#[actix_rt::test]
async fn test_evaluate_policy_endpoint() {
    let app_state = create_test_state();
    let app = test::init_service(App::new().app_data(app_state).route(
        "/api/v1/authz/evaluate",
        web::post().to(api::evaluate_policy),
    ))
    .await;

    let payload = json!({
        "subject": {
            "user_id": "usr-oem-101",
            "tenant_id": "acme-oem",
            "role": "design_engineer",
            "clearance": "confidential",
            "attributes": {}
        },
        "action": "read",
        "resource": {
            "resource_id": "bom-pcba-x1",
            "resource_type": "bom",
            "tenant_id": "acme-oem",
            "sensitivity": "confidential",
            "attributes": {}
        },
        "context": {
            "current_time": "2026-11-13T20:00:00Z",
            "nda_signed": true,
            "ip_address": "192.168.1.1"
        }
    });

    let req = test::TestRequest::post()
        .uri("/api/v1/authz/evaluate")
        .set_json(&payload)
        .to_request();
    let resp: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(resp["decision"], "allow");
    assert!(resp["latency_nanos"].as_u64().unwrap() < 10_000_000);
}

#[actix_rt::test]
async fn test_cross_tenant_denial_endpoint() {
    let app_state = create_test_state();
    let app = test::init_service(App::new().app_data(app_state).route(
        "/api/v1/authz/evaluate",
        web::post().to(api::evaluate_policy),
    ))
    .await;

    let payload = json!({
        "subject": {
            "user_id": "usr-oem-101",
            "tenant_id": "acme-oem",
            "role": "design_engineer",
            "clearance": "confidential",
            "attributes": {}
        },
        "action": "read",
        "resource": {
            "resource_id": "bom-pcba-x1",
            "resource_type": "bom",
            "tenant_id": "globex-oem", // Mismatched tenant
            "sensitivity": "confidential",
            "attributes": {}
        },
        "context": {
            "current_time": "2026-11-13T20:00:00Z",
            "nda_signed": true
        }
    });

    let req = test::TestRequest::post()
        .uri("/api/v1/authz/evaluate")
        .set_json(&payload)
        .to_request();
    let resp: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(resp["decision"], "deny");
}

#[actix_rt::test]
async fn test_bom_parse_endpoint() {
    let app_state = create_test_state();
    let app = test::init_service(
        App::new()
            .app_data(app_state)
            .route("/api/v1/bom/parse", web::post().to(api::parse_bom)),
    )
    .await;

    let csv_content = "MPN,Manufacturer,Description,Quantity,Designators,Price\n\
        STM32F401RET6-TR,STMicroelectronics,MCU 32BIT,5,U1 U2,4.80\n\
        RC0603FR-0710KL,Yageo,10K Resistor,20,R1 R2,0.01\n";

    let payload = json!({ "raw_content": csv_content });
    let req = test::TestRequest::post()
        .uri("/api/v1/bom/parse")
        .set_json(&payload)
        .to_request();
    let resp: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(resp["valid_lines"], 2);
    assert_eq!(resp["total_components"], 25);
    assert_eq!(resp["items"][0]["normalized_mpn"], "STM32F401RET6");
}

#[actix_rt::test]
async fn test_agent_validate_rule_endpoint() {
    let app_state = create_test_state();
    let app = test::init_service(App::new().app_data(app_state).route(
        "/api/v1/agent/validate-rule",
        web::post().to(api::validate_agent_rule),
    ))
    .await;

    let payload = json!({
        "rule": {
            "id": "unsafe-rule-1",
            "name": "Wildcard Rule",
            "description": "Overly permissive rule",
            "effect": "allow",
            "allowed_roles": ["*"],
            "allowed_actions": ["export_pricing"],
            "allowed_resource_types": ["pricing"],
            "max_sensitivity": "restricted_price",
            "require_nda": false,
            "require_same_tenant": false
        }
    });

    let req = test::TestRequest::post()
        .uri("/api/v1/agent/validate-rule")
        .set_json(&payload)
        .to_request();
    let resp: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(resp["is_valid"], false);
    assert!(resp["security_score"].as_u64().unwrap() < 50);
}

#[actix_rt::test]
async fn test_agent_profile_query_endpoint() {
    let app_state = create_test_state();
    let app = test::init_service(App::new().app_data(app_state).route(
        "/api/v1/agent/profile-query",
        web::post().to(api::profile_agent_query),
    ))
    .await;

    let payload = json!({
        "sql_query": "SELECT * FROM bom_items WHERE quantity > 50"
    });

    let req = test::TestRequest::post()
        .uri("/api/v1/agent/profile-query")
        .set_json(&payload)
        .to_request();
    let resp: serde_json::Value = test::call_and_read_body_json(&app, req).await;

    assert_eq!(resp["is_production_ready"], false);
    assert!(resp["detected_anti_patterns"].as_array().unwrap().len() >= 2);
}
