# Verification evidence — 15 November 2026

Verified locally on an arm64 developer machine using the production container. These results demonstrate executable engineering behavior; they do not establish production SLOs or operational history.

## Application checks

- Rust formatting and Clippy with warnings denied: passed.
- Rust unit/API tests: 25 passed.
- PostgreSQL isolation, authorization, concurrency, recovery, fencing, cancellation, retry and queue-capacity tests: 7 passed, using random schemas in the disposable `nexus_platform_test` database.
- Go race tests: passed.
- Web unit tests: 11 passed.
- Production standalone web/container build: passed.
- MCP stdio protocol, read-only tools, errors and secret redaction: passed.
- Full authenticated browser-session/BFF/Rust/PostgreSQL/Go smoke: passed against both isolated development services and the production container. Covers separate tenants, forged identities, role revocation, stale edits, idempotency, durable results, audit and bounded lists.
- Workspace visually checked at desktop and 390px mobile width; no horizontal document overflow.

## Local parsing benchmark

100 requests at concurrency 8, each containing 100 BOM rows, with five warmup requests. Client-observed HTTP latency through the production web proxy:

| Measure | Result |
| --- | ---: |
| Errors | 0 |
| p50 | 41.4 ms |
| p95 | 65.71 ms |
| p99 | 77.5 ms |
| Throughput | 178.22 requests/s |

Measured from the uncommitted foundation working tree based on `afa0080`, Python 3.13.7, arm64. Container size: 133,810,682 bytes. Reproduce using the commands in README; machine contention and dataset change the results. Raw local reports are under ignored `.nexus/evidence/`.

## Executed Kubernetes verification

The actual Helm chart passed in a unique disposable Kind v0.32.0 cluster (Kubernetes v1.36.1), using the exact production container. Two replicas became ready; a rolling restart served 120 health requests with zero failures. An intentionally unavailable image failed its atomic upgrade, then Helm automatically rolled back to a deployed, ready release. The isolated cluster was deleted after verification; existing clusters and contexts were untouched.

## Release limits

The existing Aether deployment uses its own Git builder and may be unavailable during builds. Kubernetes verification applies to the actual Helm chart in a disposable local Kind cluster, not a provisioned production Kubernetes account. Flux promotion requires real cluster credentials and runtime secrets. Supplier credentials are absent from local verification, so sourcing results explicitly retain reference-data provenance. Request correlation is implemented; an OpenTelemetry exporter is not. AI/model dependencies have not been added.

Post-deployment verification exposed two legacy edge cases: an unconfigured optional Pusher client and the historical demo UUID. Both were fixed; a regression test and full local read-only demo check now cover the demo identity.

## Follow-up workflow verification — 15–16 November 2026

The sourcing-job workflow now recomputes explainable heuristic scores for both newly fetched rows and recovered checkpoints. Revision summaries preserve quantity, price coverage, missing lead times, and live/reference provenance. Missing prices are excluded from partial totals; an entirely unpriced BOM has a null cost. Unknown scoring inputs remain unscored and require attention. The UI labels the sum as the cost of priced lines and reports coverage explicitly; one distributor is not presented as one manufacturer.

Local verification passed: formatting, Clippy with warnings denied, 28 Rust unit/API tests, 7 disposable PostgreSQL tests, 13 web tests, MCP protocol checks, Go race checks, and a production container build. The real worker recovery integration test verifies the saved revision summary and scoring after an expired lease. The complete production-container smoke checks the summary's quantity math/provenance as well as identity, tenant isolation, role revocation, revisions and idempotency. Login callback tests reject external-host redirects, backslashes, control characters and executable URL schemes while retaining local paths from legacy absolute URLs.

The final release smoke uses its own uniquely named database on the local fixture PostgreSQL server, separate from `make dev`, so older development workers cannot claim release-verification jobs. Browser verification covered returning to `/bom-importer` after sign-in, importing the 19-row sample, confirming its saved state, and opening it in the workspace. The sourcing report was checked at desktop and 390px mobile width without horizontal document overflow.

Build reliability follow-up: Geist and Geist Mono are now bundled as licensed local WOFF2 assets from a pinned Vercel source revision. Application compilation no longer needs a Google Fonts request. The original network-dependent web build stalled during verification; the local-font production build and subsequent container/Helm checks are recorded in `.nexus/evidence/`.

A local Kind verification attempt timed out pulling its fixture database image. The verification script now resolves fixture images on the host and loads their tested platform into Kind before starting readiness checks, so application rollout timing does not include a second registry download. This changes only the disposable verification setup, not the hosted database.
