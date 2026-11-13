# Nexus Integration — Polyglot Electronics Supply Chain Platform

Software-defined electronics supply chain and PCBA quoting platform combining a **Rust (`actix-web`) monolith**, a **Go (`services/ingest`) concurrent distributor worker pool**, **in-process Rust ML stock-out & 32-D vector inference**, and a **Next.js 16 multi-tenant web application**.

## Architecture Layout

| Path | Runtime | Responsibilities |
|---|---|---|
| `crates/platform-core` | Rust (`actix-web` 4.9) | Lock-free `ArcSwap` ABAC/RBAC Policy Decision Point (< 2 µs), streaming BOM parser & MPN normalizer, in-process GBDT stock-out risk ML model, 32-D parametric cosine vector search, SQL multi-tenant query profiler, and Prometheus `/metrics`. |
| `crates/platform-cli` | Rust (`clap` 4.5) | Developer & AI agent CLI for policy evaluation, SQL multi-tenant linting, and BOM parsing. |
| `services/ingest` | Go 1.22 | Bounded goroutine worker pool fanning out concurrent distributor queries (DigiKey v4 OAuth2, Mouser Search v1, and verified multi-distributor catalog) with MOQ/price-break optimization. |
| `apps/web` | Next.js 16 + TypeScript | Multi-tenant UI, BOM Importer wizard, Platform Core Studio, Integration Hub, Architecture & ADR Handbook (`/docs`), and PostgreSQL/NextAuth v5 authentication. |
| `deploy/` & `Dockerfile` | Docker, Helm, Flux, Garden | Multi-stage polyglot container image (`Dockerfile`), Kubernetes Helm charts, Flux GitOps release, and Garden config. |

## Quickstart (Local Development)

Requirements: **Rust (stable)**, **Go 1.22+**, **Node.js 22+**.

```bash
make install   # Install web dependencies
make dev       # Starts Go ingest (:8090), Rust core (:8088), and Next.js web (:3000)
make test      # Runs Rust workspace tests, Go worker-pool tests, and web unit tests
```

## Container Build & Deployment

The root `Dockerfile` builds a self-contained polyglot image running the Go ingestion worker (`:8090`), the Rust `platform-core` server (`:8088`), and the Next.js 16 server (`:3000`) behind a single entrypoint with `/health` verification.

```bash
make build-image
docker run --rm -p 3000:3000 nexus-integration:latest
```
