# Nexus Phase 5 — Research Orchestration & Datasheet Intelligence

## What this release implements

Phase 5 extends the deployed Phase 1–4 sourcing/evidence workflow with **explicit user-initiated** research queues, secure PDF text-layer processing, bounded page-cited retrieval and conservative document property comparison. Existing Rust/Go workers, previously deployed quotas, database and manual quote functionality remain unchanged.

### A. Permitted SmartCrawl research queue

- Available from the Phase 4 Evidence & Copilot workspace after signing in as an owner or design engineer and loading a current saved BOM.
- Identifies which BOM lines lack a complete, self-reported quotation; lets the user select an exact product page at an operator-authorised supplier.
- Queues at most three user-selected research tasks for an explicit submit action, sequentially. Uses the pre-existing POST /api/regional-sourcing audit, workspace authorization, supplier policies and per-workspace/global budgets. Each task has a stable UUID request key and no automatic replay after ambiguous failures.
- Existing /api/regional-sourcing read and refresh operations show pending/submitted/unknown/completed states. User may explicitly poll an existing job; source evidence appears in Phase 4 after completion.
- No search-engine discovery, unauthorized scraping, autonomous crawling, background scheduler or speculative supplier price is added in this phase.
- Operator still needs verified source-specific permission, SmartCrawl key, approved URL prefixes and network egress controls. Proof-of-concept status does not waive supplier terms.

### B. Actual PDF text-layer extraction

- Signed-in owners/engineers may upload an original PDF under **1.5 MB** and bind the analysis request to a current workspace BOM line.
- The Next.js route POST /api/regional-sourcing/datasheet checks request origin, upstream signed workspace context, authoritative PostgreSQL membership/active workspace, BOM revision and line selection **before** invoking the native PDF processor.
- The upload is strictly bounded before multipart parsing (1.65 MB request limit). Accepted PDF must have application/pdf MIME, .pdf filename and %PDF- file header.
- Only the first **12 pages** are processed by locally installed Poppler pdftotext/pdfinfo, with subprocess timeout, fixed arguments (no shell), output bounds and a temporary per-request directory. Temporary PDF bytes are removed in a finally block, even on error. Scanned pages, OCR, password-protected PDFs and unsupported PDFs fail instead of fabricating specs.
- PDF outputs are SHA-256 fingerprinted, page- and line-cited, capped to 60 KB of extracted text and **returned to the same signed-in browser session**. No central PDF/doc index, database row, file retention, or third-party model upload is created.
- Operator should observe licensing/redistribution terms and must review whether Poppler's native decoder and resource limits are suitable for their threat model. Do not process unknown or sensitive vendor files without appropriate sandboxing.

### C. Document retrieval and comparison

- In-browser ephemeral index for at most five documents; lexical retrieval ranks verbatim source lines and reports document hash, page and line references. This is deterministic search, **not embedding-based RAG**, even though it is retrieval-assisted.
- Extracts only explicitly labelled voltage range, temperature range, package and pin count when text parsing succeeds. Values remain unverified candidates for manual review.
- Two-document comparison reports missing, different or textually matching properties, with citations. It never certifies component substitutability. Actual drop-in replacement requires pinout, electrical behavior, tolerances, PCB footprint, supplier lifecycle and application-specific engineer review.
- Explicit synthetic fixtures allow a completely reproducible demonstration without purchased APIs, supplier authorization or real PDFs.
- JSON export captures evidence identity, references and comparisons; original PDF bytes are not included.

### Deployment and verification

- New production runtime dependency: `poppler-utils` installed in final Debian-based Docker stage. No package.json or package-lock.json changes.
- No new PostgreSQL migrations or environment variables; Phase 1's existing SmartCrawl enable/egress flags control research.
- Run `cd apps/web && npm ci && npm test && npx tsc --noEmit && npm run build`. Validate the Docker image CI and a real, **lawfully obtained** multi-page text PDF in staging. Simulate unreadable scan, encrypted PDF, duplicate submissions, 401/403/409, stale revisions and multiple workspaces.
- The demo page is `/regional-sourcing/intelligence`; the regional sourcing and whole-BOM planner remain available.
- Operational caution: Poppler is a native parser; hardening further with seccomp/isolation, page-specific worker limits and sandboxed upload processing is recommended before accepting arbitrary public uploads in a commercial product.

### Not yet implemented

Automated discovery of unknown websites, scheduled background crawl orchestration, live cross-supplier offer harvesting, persistent document corpus/vector similarity search, model-driven datasheet extraction from tables/diagrams, OCR of scans, license-independent access to distributor catalogs, formal electrical equivalence or validated alternative recommendations, and any purchasing workflows. These are separate capabilities, not implied by the POC demonstration.
