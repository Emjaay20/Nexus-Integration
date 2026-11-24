# Nexus Phase 6 — Persistent Engineering Knowledge Base & Controlled Research

## Scope and architecture

This is an additive, portfolio-grade implementation of persisted PDF **extracted text** and consent-based, bounded scheduled supplier research. Phase 6 does not store original uploaded PDFs, create vectors/embeddings, pay for supplier APIs, certify interchangeable electronics, or enable vendor crawling automatically.

### Tenant-isolated knowledge documents

- The new `202611240004_knowledge_research.sql` migration creates `platform_knowledge_documents`, `platform_knowledge_versions`, `platform_knowledge_pages` and `platform_research_schedules`.
- Versions are immutable and carry SHA-256 of uploaded PDF bytes, origin filename, extracted properties, page number, author, timestamp and truncated indicator. The document's `active_version` points to the newest; earlier versions remain available as metadata. Original PDF bytes are **deleted after processing** by Phase 5 Poppler and are never stored in this database.
- Documents are strictly scoped to workspace/BOM/line. Before saving, searching, listing, deleting or retrieving history, the API checks a signed Rust workspace session, the authoritative PostgreSQL membership and active workspace, and the **current** BOM revision. Writes require owner or design-engineer permissions.
- Text storage is bounded to **five logical documents per BOM, 20 versions each, 12 pages per version, 60 KB extracted text per version**, with per-page UTF-8 byte caps. Future schema changes could replace this with tenant-encrypted blob storage, explicit retention policies and a vector store.
- PostgreSQL `tsvector` indexes **active document-version pages**. Search returns only short cited text excerpts (`sha256:...:vN:pN`), with no model-generated passages. Supplied PDFs are unverified: a citation proves only that text exists in that uploaded document.
- Existing Phase 5 upload now has an **unchecked by default** “Save extracted PDF text” control; users can upload new versions to an existing logical document. A scoped delete removes the record, all versions and pages; no automatic document retention/archiving to unrelated users.
- Viewer roles are read-only. Audit entries record metadata operations but never raw extracted page text. Sensitive vendor PDFs should **not** be uploaded until appropriate access and encryption agreements are in place.

### Controlled research scheduling

- Authenticated user interface and `/api/regional-sourcing/schedules` provide create, list, pause, resume and delete for schedules bound to exact workspace/BOM revision, quantity, country, supplier and approved HTTPS product URL.
- A user explicitly consents to recurring research, with a minimum 24-hour interval and a maximum of **12 attempts**, and at most five active/paused schedules per workspace. No arbitrary URL discovery is implemented.
- Source permissions are checked at creation, resume and execution: registered supplier origin, exact allowed product path, operator reference, verified egress, SmartCrawl API key and authorisation policy. If the owner's membership, BOM revision or supplier authorisation changes, execution fails closed for operator/user review.
- A **server-to-server cron tick** reserves up to three due tasks transactionally with `FOR UPDATE SKIP LOCKED`. It applies existing daily workspace (10 research jobs) and global (40/hour) research constraints, writes an audit record and a persistent regional research row **before** sending SmartCrawl a request. No POST retry occurs after ambiguous results. A 24h+ interval avoids hot loops.
- Each authorised tick may additionally poll up to three **already-submitted** scheduler research jobs, using a fenced poll token and the Phase 1 SmartCrawl identity/source-verification logic. Polls never submit another crawl. Completed observations remain **unverified candidates**, not accepted customer quotes.
- Pausing or deleting prevents future reservations but cannot cancel a request that is already dispatched. `submission_unknown` is never silently replayed; it requires operator investigation.
- The scheduler is **OFF by default** and is not deployed as an always-running process by this pull request. Configure it explicitly on a secured VPS or orchestration service.

### Operator activation after reviewed migration/deployment

1. Back up production Neon/PostgreSQL, check available storage and privileges, and verify the migrations against a **staging clone first**. The Rust workspace applies SQLx migrations at startup. Deployment requires monitoring Rust readiness; do **not** manually re-run an applied migration. Rollback planning should keep old versioned tables intact until reviewed.
2. Leave scheduled crawling disabled until vendor permission and SmartCrawl egress checks are documented and tested. Confirm `NEXUS_REGIONAL_SMARTCRAWL_ENABLED=true`, `NEXUS_SMARTCRAWL_CATALOG_EGRESS_VERIFIED=true`, configured dedicated URL/API key, and narrow `NEXUS_REGIONAL_CRAWL_POLICIES` for approved sites only.
3. Set a new independent random private secret (minimum 32 characters) and opt-in flag:

       NEXUS_RESEARCH_SCHEDULER_ENABLED=false
       NEXUS_RESEARCH_CRON_TOKEN=<separate-secret-not-the-user-session-secret>

   After staging authorization and due-job tests, set the flag to true. Keep the cron secret off GitHub, out of browser JS and out of application logs.
4. Configure an **external** 15-minute HTTPS cron on the AetherHost VPS, using a secure secret environment file, not a shell command embedded with the secret in version control. Example (substitute private service URL):

       curl --fail --silent --show-error --max-time 20 -X POST          -H "Authorization: Bearer ${NEXUS_RESEARCH_CRON_TOKEN}"          https://nexus-integration.aetherhost.app/api/internal/regional-research/tick

   This endpoint enforces the separate secret and refuses jobs while disabled. Use a process-level scheduler with overlap protection and restricted logs.
5. Test one due research schedule against an **authorized sandbox product page**. Confirm only one `platform_regional_sourcing` row per planned attempt, accurate `run_count`, conservative behavior on ambiguous response, and that polling records page evidence without creating a price quote.

### Demonstration and evaluation

- Open `/regional-sourcing/intelligence` as a signed-in engineer, choose a saved BOM and upload an authorized text PDF. Toggle “Save extracted PDF text” to persist it. Upload a revision to the same logical document and verify history, search and deletion.
- Demonstrate a **synthetic** source-only retrieval using the existing Phase 5 fixture (no API credentials, no commercial data).
- Run: `cd apps/web && npm ci && npm test && npx tsc --noEmit && npm run build && npm run eval:phase6`
- The evaluation prints JSON metrics for retrieval top-1 hits, page/line citation validity, missing quote coverage, bounded optimiser and the absence of approved alternates. It expressly marks real supplier, real-PDF storage and live cloud scheduling acceptance as **not evaluated** by the synthetic benchmark.
- Staging acceptance must also test two separate workspaces, role revocation, duplicate concurrent PDF writes, migration availability, encrypted/scanned PDF failure, source policy change, paused schedules, API timeouts, and intentional cron shutdown before production rollout.

### Explicit remaining gaps

No at-rest **application-layer encryption of PDF text** beyond the configured database/provider protections; no semantic vector embedding store, persistent original PDF object storage, automatically discovered product URLs, external supplier permissions, verified OCR, complete electronics pin-compatibility evaluation, self-acting ordering/payment, or commercial supplier API guarantees. Native PDF parser isolation should be independently hardened before untrusted large-scale public ingestion.

These gaps are not masked by synthetic demos or generated data. The technical artifact demonstrates repeatable tenant-scoped persistence, text search, version management, durable scheduling and a guarded data-acquisition lifecycle.
