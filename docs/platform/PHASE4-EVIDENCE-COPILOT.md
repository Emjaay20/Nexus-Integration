# Nexus Phase 4 — Evidence Intelligence & Procurement Copilot

## Purpose

A portfolio-grade demonstration of evidence-aware procurement intelligence, **not** an autonomous purchasing service. Links Nexus saved BOMs, regional sourcing observations, SmartCrawl results and existing Go/Rust supplier worker snapshots in one traceable read-only workspace. Existing Phase 1–3 sourcing and planning remain unchanged.

### Interface

- /regional-sourcing/intelligence — public labelled synthetic fixture; signed-in users may load BOM revision + delivery country and private evidence.
- /api/regional-sourcing/evidence GET — authenticated evidence retrieval from existing records.
- /api/regional-sourcing/evidence POST (action=ask) — authenticated question answering from current private snapshot with no new supplier requests or writes.
- A local paste-in **datasheet text** parser extracts only explicitly labelled voltage range, temperature range, package and pin count lines for manual review. It does not download or parse PDF files and never qualifies an engineering substitution.

### Evidence classifications

1. **Customer-reported quotations** — may be marked complete for the stored quantity when expiry, stock, MOQ, currency conversion, identity, destination, fees and freight are all present. These remain self-reported, not supplier-authenticated.
2. **SmartCrawl observations** — product-page JSON-LD / LLM candidates with source URL, timestamp and excerpt where recorded. Unranked, review-required; never converted into a priced quotation automatically.
3. **Supplier-worker live-labelled observations** — distributor API results from saved jobs, still not a landed-cost or purchasing guarantee.
4. **Supplier-worker reference** — illustrative/reference observations, never live-price claims.
5. **Synthetic demo** — labelled fictitious suppliers, missing data and manufacturer-like datasheet text solely for repeatable engineering demonstrations.

The evidence model returns a distinct citation reference for each record, extracts only bounded supported fields, escapes strings in React and in CSV export, and only exposes safe HTTPS source links. When no commercial evidence is available, missing fields and quotes are not fabricated.

### Copilot behaviour

The default mode is **deterministic grounded rules**: it counts complete quotation coverage and produces actionable review findings with citations to the saved evidence records. Users can ask cost, risk, research and compatibility questions, but no answer can approve a component substitution, order or payment.

Optional server-only Groq action prioritization is controlled by:

    NEXUS_PHASE4_LLM_ENABLED=false
    GROQ_API_KEY=<secret in private runtime>
    # optional GROQ_MODEL or NEXUS_PHASE4_MODEL

The model receives only user question plus a bounded list of already-determined finding IDs/categories/severities. It does not receive the BOM, raw supplier pages, full quotations, datasheet excerpts, user identity or workspace data. It must return an exact JSON list of known IDs. Invalid/unavailable model responses fall back to deterministic ordering; **model output never becomes a fact, quote or citation**. Authentication, per-workspace budgets and separate model budgets apply. No user input is used as an instruction for tool execution.

### Access, reliability and data retention

- GET and POST require NextAuth -> existing signed Rust workspace context -> authoritative membership and BOM revision checks in one PostgreSQL transaction. Viewers can read but cannot mutate sourcing records via this route. The public demo is entirely local in the browser.
- Only completed regional sourcing records for the selected workspace/BOM/current revision/country are read; up to 300 records. Latest completed Rust worker snapshot is also used when aligned by exact line MPN.
- Zero new database schema migrations or external supplier credentials are required. Content remains scoped to the already-existing workspace tables.
- No source-specific web scraping is activated or performed by Phase 4. Research gaps redirect to Phase 1's permission-gated SmartCrawl workflow. Being a noncommercial PoC does not override terms or access rules.
- All routes are no-store, bounded and rate-limited. No external model calls without both an operator toggle and explicit signed-in user opt-in; no hidden background calls.

### Acceptance tests

Run the existing app tests and release checks on a feature branch:

    cd apps/web
    npm ci
    npm test
    npx tsc --noEmit
    npm run build

After CI, in staging:
1. Public demo displays fictional evidence, honest coverage, deterministic cited findings, missing source research hints and CSV export.
2. Verify datasheet paste parsing and that vague or absolute-maximum claims are not reclassified as operating conditions. Use manufacturer documents lawfully and verify the extracted candidate against the original.
3. For an authenticated user with saved BOM and quotations, confirm per-source type/price/expiry, reference vs live provider separation, workspace role revocation, cross-workspace access denial and stale revisions.
4. Verify no model network traffic unless both toggles and user consent are present; simulate model timeout and malicious output and confirm deterministic fallback.
5. Verify zero autonomous crawling, no new writes, no supplier order submission and no raw secrets or user data in logs.

**Deferred:** authenticated document upload/PDF ingestion, datasheet page-level citations, scientific compatibility verification, persistence and vector-search retrieval for source documents, background authorized crawl orchestration, vendor integration evidence signatures, benchmarked model retrieval accuracy and all actual procurement financial transactions.
