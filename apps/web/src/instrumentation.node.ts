import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor, type ReadableSpan, type SpanExporter } from "@opentelemetry/sdk-trace";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { W3CTraceContextPropagator, type ExportResult } from "@opentelemetry/core";

// Next.js can attach URL/query attributes. Export only route templates and status;
// never URLs, authorization headers, cookies, user data, prompts or BOM contents.
const allowed = new Set(["http.method", "http.request.method", "http.status_code", "http.response.status_code", "next.route", "http.route", "workspace.operation"]);
const target = new OTLPTraceExporter({ url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT!.replace(/\/$/, "")}/v1/traces`, timeoutMillis: 2000 });
const exporter: SpanExporter = {
  export(spans: ReadableSpan[], callback: (result: ExportResult) => void) {
    target.export(spans.map(span => Object.assign(Object.create(span), {
      name: "web.request",
      attributes: Object.fromEntries(Object.entries(span.attributes).filter(([key]) => allowed.has(key))),
      events: [], links: [],
    })), callback);
  },
  shutdown: () => target.shutdown(),
};
const sdk = new NodeSDK({
  autoDetectResources: false,
  resource: resourceFromAttributes({ "service.name": "nexus-web" }),
  textMapPropagator: new W3CTraceContextPropagator(),
  spanProcessors: [new BatchSpanProcessor({ exporter, maxQueueSize: 512, maxExportBatchSize: 128, exportTimeoutMillis: 2000 })],
});
sdk.start();
process.once("SIGTERM", () => { void sdk.shutdown(); });
