# Nexus and the Luminovo platform role

Assessment: 15 November 2026. Nexus is a deployed, production-oriented portfolio project with executable engineering evidence. It is not evidence of years operating a customer platform, production Kubernetes adoption, or organization-wide staff-level impact.

The current [Luminovo role](https://jobs.ashbyhq.com/luminovo/c3c7438e-8f66-4ff2-8df3-c1f078fde121) describes Team Core as improving other engineering teams' productivity through Rust architecture, permissions, CI/CD, developer experience and agent use. Its Rust/Actix, React/TypeScript and PostgreSQL stack overlaps with Nexus. Helm/Flux manifests and executed local/CI Kubernetes checks demonstrate release engineering; Aether remains the public hosting provider.

## Evidence to demonstrate

| Role responsibility | Working evidence | Limits to explain |
| --- | --- | --- |
| Rust architecture and shared capabilities | Typed actors/errors, authoritative permissions, transactional audit, scoped SQL, versioned migrations | One application; no evidence yet of multiple teams adopting the abstractions |
| Reliable delivery | Tests before image publication, immutable image artifact, actual Helm rollout and atomic rollback checks | Disposable Kind, not a provisioned production Kubernetes/Flux installation; Aether Git builds can interrupt availability |
| Developer experience | Isolated `make dev`, safe fixture database tests, doctor/smoke commands and interview walkthrough | Onboarding time and developer feedback have not yet been measured |
| Reliable application execution | Durable revision snapshots, idempotency, capacity bounds, retries, expired-lease recovery, fencing and cancellation | At-least-once supplier reads; bounded laptop verification, not customer-scale traffic |
| Productive agent tooling | Read-only MCP parsing/review/configuration tools with protocol and redaction checks | No agent-task quality benchmark or application LLM integration |
| Observability | Request IDs across BFF/Rust/Go, structured logs, metrics and dashboard configuration | Correlation, not exported distributed traces; no operational SLO/alert history |
| Electronics domain | CSV/Excel BOM import, quantities, sourcing results, provenance and explainable heuristic scores | Reference results without supplier credentials; scores are not validated forecasts; distributor diversity is not manufacturer diversity |

## Next work, in priority order

1. **Operational visibility and failure drill.** Export OpenTelemetry spans across web/Rust/Go to a local collector, preserve redaction, define a measured availability/latency objective and alerts, then simulate an upstream timeout and a worker crash. Acceptance: one trace links the request to the job and supplier batch; a documented alert fires and a runbook restores service in the isolated environment. Do not add BOM contents or secrets as span attributes.
2. **Public-service controls and recovery.** Add measured request/body limits, authenticated submission quotas, abuse controls for registration/sign-in, and retention/pagination for audit and job records. Practice backup restoration into a separate disposable database. Acceptance: tests show bounded resource use and a restored workspace with its audit trail and jobs, without touching hosted data.
3. **Measure developer experience.** Have another engineer follow the documented setup, record time to a passing smoke test and first safe change, then remove the largest friction. Capture cold/warm CI and image-build timings before optimizing. Acceptance: reproducible before/after measurements and recorded feedback, rather than an unsupported productivity claim.
4. **One real supplier integration.** After the user provisions a supplier account, verify one real response using server-only credentials. Add fixture-based contract tests for rate limiting, partial data, malformed replies and credential refresh. Acceptance: real quote provenance, quantities and freshness are visible; unavailable data remains unknown. Do not claim live quotes from catalog fixtures.
5. **Evaluate agent tooling before adding product AI.** Run a small, published set of repository tasks using the read-only MCP tools; measure correctness, useful failures and secret redaction. Later, an optional model-assisted explanation can cite saved BOM/job facts while Rust continues to enforce every permission. It must not mutate membership or execute arbitrary SQL/shell. Do not add model dependencies during the foundation work.

## Interview positioning

Show a short workflow: import a BOM, revise it, demonstrate a viewer denial, submit the same job twice, recover a worker checkpoint, inspect the audit request ID, then show rollout/rollback evidence. Explain why each boundary exists and which failure each test protects against. Be ready to make a small Rust change and explain its consequences independently.

For senior-level evidence, emphasize implementation quality, failure handling and ownership of tradeoffs. For staff-level evidence, add proof of adoption by other engineers, architectural decisions that improve several workflows, measured productivity outcomes and operational learning. Adding more infrastructure products without a demonstrated need is weaker evidence than a smaller system with clear boundaries and measured behavior.

Check actual role eligibility, location and production Rust experience separately. The project supports an application; it cannot guarantee a level or substitute for an accurate account of your experience.
