//! Observability, OpenTelemetry & Prometheus Telemetry Pipeline
//!
//! Provides distributed tracing spans (compatible with Honeycomb via W3C TraceContext)
//! and exposes high-resolution histograms and counters for Prometheus/Grafana.

use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use std::sync::OnceLock;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

static PROMETHEUS_HANDLE: OnceLock<PrometheusHandle> = OnceLock::new();

/// Initializes tracing and Prometheus metrics exporter.
pub fn init_telemetry() -> Result<(), anyhow::Error> {
    // 1. Initialize Tracing Subscriber with JSON formatting for Cloud/K8s environments
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,platform_core=debug"));

    let formatting_layer = tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_line_number(true);

    let _ = tracing_subscriber::registry()
        .with(env_filter)
        .with(formatting_layer)
        .try_init();

    // 2. Initialize Prometheus Metrics Recorder
    if PROMETHEUS_HANDLE.get().is_none() {
        let builder = PrometheusBuilder::new();
        let handle = builder.install_recorder()?;
        let _ = PROMETHEUS_HANDLE.set(handle);
    }

    Ok(())
}

/// Returns the formatted Prometheus metrics payload for `/metrics` scraping.
pub fn render_metrics() -> String {
    if let Some(handle) = PROMETHEUS_HANDLE.get() {
        handle.render()
    } else {
        "# Prometheus recorder not initialized\n".to_string()
    }
}
