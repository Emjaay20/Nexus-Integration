# Nexus platform engineering foundation

This is an executable portfolio implementation of tenant-safe application services, durable workers, developer tooling, and verified release behavior. It is not a claim of years of production operation or validated ML accuracy.

## Local development

Prerequisites: Docker, stable Rust, Go 1.22+, Node 22+, Python 3.

```sh
make doctor
make install
make dev
```

Open http://localhost:3100/workspace. The local database is isolated on port 15432. The script creates an ignored, mode-0600 signing secret, disables external supplier and messaging credentials, and starts Go (:18090), Rust (:18088), and Next.js (:3100). It never overwrites the existing web `.env`. Ctrl-C stops only the processes it started; the database volume remains. The public demo is read-only. Register a local account to create or edit BOMs.

```sh
python3 scripts/workspace-smoke.py
```

The smoke test creates two localhost-only accounts and exercises the complete session/BFF/Rust/Postgres/Go path. It checks tenant isolation, forged headers, role changes and revocation, stale edits, deduplicated job submission, persisted background results, and audit history. Test credentials are stored only in ignored `.nexus/smoke-account.json` (0600).

## Trust boundaries

1. NextAuth verifies the browser session. The BFF takes only the persisted user UUID from it.
2. The BFF signs a 30-second, audience-bound assertion with `CORE_AUTH_SECRET` (or the existing `AUTH_SECRET`). It contains no role or tenant claim.
3. Rust verifies the MAC, audience, and expiry, then loads the active workspace and membership role from PostgreSQL on every request.
4. Each repository query independently binds that workspace. Knowing another BOM UUID does not grant access. Cross-workspace object requests return 404 and record a denial in the requester's own audit scope.
5. The policy evaluator used by protected operations has its own conservative rules. Public Studio simulations and policy reloads cannot change it.

The BFF is a trusted service; compromise of its signing secret or database credentials is outside this application's authorization boundary. Internal traffic stays on loopback in the unified container. A distributed deployment would additionally need service authentication, TLS, secret rotation, and network policies.

Legacy role and organization labels were self-selected, so they are deliberately not imported as trusted workspace memberships. Each existing account starts with an isolated workspace. Only an owner can grant another registered user engineer/viewer membership. The new workflow does not delete legacy `bom_imports` records; new imports are saved in `platform_boms`.

## Rust application design

- `workspace/auth.rs`: bounded signed assertions and a typed `Actor` request extractor.
- `workspace/mod.rs`: validated domain types, typed application errors, PostgreSQL pool, and protected policy set.
- `workspace/routes.rs`: tenant-scoped operations and transactional audit records.
- `workspace/jobs.rs`: durable job claiming, retries, cancellation, and fenced checkpoints.
- `migrations/`: versioned, additive SQLx migrations, locked during startup.

A BOM update requires its current revision. The SQL update checks workspace, ID, and revision atomically, then commits the new revision and audit event together. Stale writers receive 409. Viewers can read; engineers can create/update/run jobs; owners can additionally manage membership and read the audit trail. The HTTP body cannot set ownership or privileges.

Lists return metadata for the latest 50 BOMs/jobs; large item/result payloads are fetched separately. Each BOM is capped at 500 rows, request JSON at 2MB, and raw CSV at 1MB. The first version shows up to 100 members and 100 recent audit records; cursor pagination and an explicit retention policy are future work.

## Durable execution semantics

PostgreSQL is the durable queue. Redis/Kafka are not needed for this bounded workflow.

- At most 20 pending/running jobs per workspace; excess submissions receive 429. Capacity checks and idempotency are serialized within the workspace.
- Two workers per Rust process, with `FOR UPDATE SKIP LOCKED` claims.
- A 30-second lease and a unique lease token fence every progress/result write.
- Lease expiry enables recovery by a different process; completed batch checkpoints are resumed and old workers cannot overwrite the new attempt. A partially completed HTTP batch may be retried.
- Submission is idempotent per workspace and caller-provided UUID key. Reusing a key for another BOM/revision yields 409.
- Each job stores a snapshot of the BOM revision and quantities. Editing the BOM does not mutate queued input.
- Supplier requests use batches of up to 25, grouped by required quantity. Each request has a timeout. Reference/live provenance is preserved.
- Transient failures retry with exponential backoff, up to three attempts. Permanent errors and exhausted retries become `failed`.
- Membership write permission is rechecked between batches. Cancellation revokes the lease; an in-flight supplier request may finish, but it cannot write late results.

This is at-least-once processing, not exactly-once delivery. Duplicate supplier reads can occur after a crash. There are no purchasing side effects.

## Observability

The BFF, Rust HTTP handlers, durable audit records, background workers, and Go ingestion carry the same `X-Request-ID` and propagate W3C `traceparent` headers. Rust, Go, and Next.js emit structured logs and optionally export redacted OpenTelemetry OTLP spans when `OTEL_EXPORTER_OTLP_ENDPOINT` is configured (`deploy/observability/compose.yaml` provides a local Tempo/OTEL/Prometheus stack and `alerts.yml` defines Prometheus alert rules). Tokens and BOM contents are never logged or attached as span attributes.

Rust exports bounded route-template HTTP metrics, latency histograms, job outcome/duration metrics, and global queue gauges. Import `deploy/observability/grafana-dashboard.json` into Grafana with a Prometheus datasource. `prometheus.yml` demonstrates scraping the local web proxy. Queue gauges represent a global database count on each replica: use `max`, not a sum across replicas.

```sh
python3 scripts/benchmark.py --url http://localhost:3300 --requests 100 --concurrency 8
```

The benchmark records client-observed p50/p95/p99, errors, throughput, dataset size, machine architecture, commit, and dirty-tree status. Use the production container on :3300 for meaningful results. Measurements from one laptop are not production SLOs. Read `EVIDENCE.md` for the actual verification results.

## Read-only MCP development tools

```sh
make mcp-test
```

`platform-mcp` is a real newline-delimited JSON-RPC stdio server pinned to MCP revision 2025-11-25. It supports initialize, tools/list, tools/call, resources/list/read, and ping. Tools parse BOMs, review SQL text, inspect proposed policy rules, and report configuration presence. They cannot execute SQL, run shell commands, change permissions, or read production records. SQL reviews are advisory.

Use `.mcp.json.example` as an editor configuration example from this repository directory. The protected workspace additionally includes an advisory, snapshot-scoped AI Sourcing Brief (`POST /api/workspace/jobs/{id}/brief`) backed by `GROQ_API_KEY` (or `GEMINI_API_KEY`) with workspace quotas, caching, deterministic fallback, and audit logging.

## Release verification and promotion

The root Dockerfile builds a non-root runtime with the Next.js standalone output; development dependencies and source trees are not copied into the runtime. BuildKit caches Rust and Go compilation and npm downloads.

```sh
docker build --tag nexus-platform:verify .
make k8s-verify
```

The script creates a uniquely named Kind cluster and always addresses that explicit context. It provisions a fixture database and fixture secrets, loads the exact built image, installs the actual Helm chart, probes service availability during a rolling restart, and intentionally deploys an unpullable image to verify atomic rollback. It deletes only its own disposable cluster.

CI runs the real Postgres security/job suite and MCP protocol checks. It builds one image, verifies that exact image in Kind, and only then pushes it with the commit tag. The immutable registry digest and rollout/rollback evidence are uploaded as artifacts.

```sh
python3 scripts/promote.py path/to/tested-image.txt
git diff -- deploy/flux/helm-release.yaml
```

Promotion prepares a reviewable digest-pinned Flux manifest; it does not silently deploy an untested `latest` tag. Provision `nexus-runtime` in the target namespace with `DATABASE_URL`, a shared signing secret, and auth configuration. Configure `imagePullSecrets` if the registry package is private. Flux needs its source/Helm controllers and the referenced namespaces installed by the cluster owner.

The existing public Aether application uses Aether's own Git-triggered builder. The verified Kubernetes rolling/rollback path does not change Aether's control plane or guarantee downtime-free Aether builds. No Azure/Kubernetes production account has been provisioned.

## Verification commands

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --locked
TEST_DATABASE_URL=postgresql://.../nexus_platform_test cargo test --workspace --locked -- --ignored
make mcp-test
(cd services/ingest && go test -race ./...)
npm --prefix apps/web test
npm --prefix apps/web run build
```

Database integration tests refuse any database whose name is not exactly `nexus_platform_test`, use fresh random schemas, and drop only those schemas. Do not point them at a user or production database.

## Role fit and next improvements

See [ROLE-FIT.md](ROLE-FIT.md) for the Luminovo responsibility-to-evidence mapping, explicit limits, and prioritized work with acceptance criteria.
