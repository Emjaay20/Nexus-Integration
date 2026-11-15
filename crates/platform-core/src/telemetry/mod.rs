//! Correlated request/job logging and Prometheus metrics.
//!
//! Uses a shared request UUID across the BFF, Rust, SQL audit, and Go ingestion.
//! This module does not claim an OpenTelemetry or W3C exporter.

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
        .json()
        .with_target(true)
        .with_thread_ids(true)
        .with_line_number(true);

    let _ = tracing_subscriber::registry()
        .with(env_filter)
        .with(formatting_layer)
        .try_init();

    // 2. Initialize Prometheus Metrics Recorder
    if PROMETHEUS_HANDLE.get().is_none() {
        let builder = PrometheusBuilder::new().set_buckets_for_metric(
            metrics_exporter_prometheus::Matcher::Suffix("_seconds".into()),
            &[
                0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0,
                120.0, 300.0, 600.0,
            ],
        )?;
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

/// Correlates HTTP requests without logging tokens or BOM contents. Labels use
/// route templates instead of raw UUID paths to keep metric cardinality bounded.
pub struct RequestTelemetry;
use actix_web::{
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    http::header,
    Error,
};
use futures_util::future::{ready, LocalBoxFuture, Ready};
use std::{
    rc::Rc,
    task::{Context, Poll},
    time::Instant,
};
use tracing::Instrument;
impl<S, B> Transform<S, ServiceRequest> for RequestTelemetry
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = TelemetryService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;
    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(TelemetryService {
            service: Rc::new(service),
        }))
    }
}
pub struct TelemetryService<S> {
    service: Rc<S>,
}
impl<S, B> Service<ServiceRequest> for TelemetryService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;
    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }
    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let id = req
            .headers()
            .get("x-request-id")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| uuid::Uuid::parse_str(v).ok())
            .unwrap_or_else(uuid::Uuid::new_v4)
            .to_string();
        if let Ok(value) = header::HeaderValue::from_str(&id) {
            req.headers_mut()
                .insert(header::HeaderName::from_static("x-request-id"), value);
        }
        let method = match req.method().as_str() {
            "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" => {
                req.method().to_string()
            }
            _ => "OTHER".into(),
        };
        let service = self.service.clone();
        let span = tracing::info_span!("http_request",request_id=%id,method=%method);
        Box::pin(async move{let start=Instant::now();let mut response=service.call(req).await?;let route=response.request().match_pattern().unwrap_or_else(||"unmatched".into());let status=response.status().as_u16().to_string();
   metrics::counter!("http_requests_total","route"=>route.clone(),"method"=>method.clone(),"status"=>status.clone()).increment(1);
   metrics::histogram!("http_request_duration_seconds","route"=>route.clone(),"method"=>method).record(start.elapsed().as_secs_f64());
   tracing::info!(route,status,elapsed_ms=start.elapsed().as_millis(),"request completed");
   if let Ok(value)=header::HeaderValue::from_str(&id){response.headers_mut().insert(header::HeaderName::from_static("x-request-id"),value);}Ok(response)
  }.instrument(span))
    }
}
