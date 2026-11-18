package main

import (
	"context"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"net/http"
	"os"
	"time"
)

func init() { otel.SetTextMapPropagator(propagation.TraceContext{}) }
func initTracing(ctx context.Context) (func(context.Context) error, error) {
	if os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT") == "" {
		return func(context.Context) error { return nil }, nil
	}
	exporter, err := otlptracehttp.New(ctx, otlptracehttp.WithTimeout(2*time.Second), otlptracehttp.WithRetry(otlptracehttp.RetryConfig{Enabled: false}))
	if err != nil {
		return nil, err
	}
	provider := sdktrace.NewTracerProvider(sdktrace.WithResource(resource.NewWithAttributes("", attribute.String("service.name", "nexus-ingest"))), sdktrace.WithBatcher(exporter, sdktrace.WithMaxQueueSize(512), sdktrace.WithMaxExportBatchSize(128), sdktrace.WithExportTimeout(2*time.Second)))
	otel.SetTracerProvider(provider)
	return provider.Shutdown, nil
}
func traceHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		ctx, span := otel.Tracer("nexus-ingest").Start(ctx, "ingest.request")
		defer span.End()
		route := "unmatched"
		switch r.URL.Path {
		case "/health", "/metrics", "/api/v1/ingest/enrich-batch", "/api/v1/ingest/catalog":
			route = r.URL.Path
		}
		span.SetAttributes(attribute.String("http.route", route), attribute.String("http.request.method", r.Method))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
