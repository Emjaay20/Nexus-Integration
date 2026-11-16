# Working on Nexus

- Protected BOMs, roles, and job transitions are authoritative in `crates/platform-core/src/workspace`. The Next.js application is a session-authenticated BFF.
- Never accept a role or ownership tenant from a browser or MCP argument as an authenticated identity. Every protected SQL query must scope the workspace, independently of policy checks.
- Keep public Studio simulations separate from the protected policy set.
- Changes to job execution must preserve idempotent submission, bounded workers, timeout/backoff limits, fencing, cancellation, and revision snapshots.
- MCP tools are read-only. They must not execute SQL or shell commands, mutate membership, or reveal secrets. Keep stdout strictly JSON-RPC.
- Prefer the isolated `make dev` environment. Database integration tests require the disposable `nexus_platform_test` database and random schemas. Do not run destructive fixtures or load tests against the public application.
- Run formatting, Clippy, Rust tests, the relevant PostgreSQL integration suite, Go race tests, web unit tests, and a production build for changes that affect those areas. `docs/platform/README.md` documents exact commands.
- Exercise the real Helm chart in the disposable Kind context before claiming rollout or rollback verification. Keep Aether hosting limitations explicit.
- AI/Copilot features must remain bounded, advisory over persisted job snapshots, audit-logged, and configured strictly via environment variables (`GROQ_API_KEY` / `GEMINI_API_KEY`); never hardcode keys or let LLMs bypass authorization or pricing math.
