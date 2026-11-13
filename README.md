# Nexus Integration

Electronics supply chain integration platform: a Rust backend service and a Next.js web app in one repository.

## Layout

| Path | What it is |
|---|---|
| `apps/web` | Next.js app: BOM importer, integration hub, connectors, Platform Core Studio. See [apps/web/README.md](apps/web/README.md). |
| `crates/platform-core` | Rust service (actix-web): permissions engine, BOM parser, sourcing analysis, agent bridge. |
| `crates/platform-cli` | Command-line client for the Rust service. |
| `deploy/` | Dockerfile, Helm chart, Flux release and garden config for the Rust service. |

## Local development

Requirements: Rust (stable), Node 22.

```bash
make install   # install web dependencies
make dev       # Rust service on :8088 and web app on :3000
make test      # Rust and web unit tests
```

The web app needs `apps/web/.env`; copy `apps/web/.env.example` and fill it in. It reaches the Rust service through `/api/platform-core/*`, which proxies to `RUST_BACKEND_URL` (default `http://127.0.0.1:8088`).

## CI

`.github/workflows/ci.yml` runs the Rust jobs (fmt, clippy, tests, dependency audit) and the web job (unit tests, typecheck, build), each only when its part of the repo changes.
