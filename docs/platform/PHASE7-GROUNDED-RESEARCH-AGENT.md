# Phase 7 — Human-approved Procurement Research Agent & Staging Acceptance

## Engineering objective

Build a practical **read-only procurement decision agent** that converts saved Nexus evidence into a prioritized, traceable review plan. The agent does **not** become an uncontrolled web crawler, a price quotation source, an autonomous purchasing system, or an electrical-compatibility certification service. Reuse all six previous phases; avoid a new database migration and preserve production access controls.

### Architecture

1. **Current BOM + permission gate:** `GET /api/regional-sourcing/agent` checks the signed workspace actor, rate limits, active workspace and **authoritative current PostgreSQL membership and BOM revision** through `requireBom` before reading evidence. Read-only viewers may inspect a plan. Source access is scoped by `workspace_id`, `bom_id` and revision.
2. **Evidence provenance:** Existing completed `platform_regional_sourcing` records provide customer-reported quotations and SmartCrawl candidates. Completed distributor-worker snapshots remain reference/observational evidence. `buildEvidence` normalizes these into separate evidence kinds; it never transforms an observed webpage into a completed supplier quote.
3. **Knowledge-base retrieval:** Phase 6's tenant-isolated document metadata provides current version, page count and SHA-256 source identity. The agent can retrieve up to 15 PostgreSQL **full-text** page excerpts for a user-selected topic. Each excerpt is citation-labelled `sha256:<fingerprint>:v<version>:p<page>`; only citations matching an actual current document version enter the plan. This is deterministic **lexical retrieval**; semantic vector search and embeddings are not part of this phase.
4. **Deterministic planning:** `planResearch` ranks missing quotes, incomplete/expired quotes, unverified research observations and missing/truncated datasheets. It returns human-readable rationales, bounded **heuristic urgency scores**, source record IDs, review evidence strength, proposed action type and manual handoff. The score is **not a calibrated risk probability**.
5. **Human approval:** Tasks link to the existing Regional Sourcing quotation entry, approved SmartCrawl research queue or datasheet workbench. **No tool is invoked** by a recommendation. The existing Phase 1–6 permissions apply when a user chooses to act. Every task sets `approvalRequired=true`; `automaticActions=0`.
6. **Grounded answers:** A small deterministic `answerAgent` selector filters those existing tasks to the user's question. It cannot create new technical facts, prices, vendor approvals or citations. The earlier optional Phase 4 Groq prioritization remains unchanged; Phase 7 itself makes no external model calls.

### Interface and API

- Phase 7 workbench appears in `/regional-sourcing/intelligence`, next to the existing evidence, PDF and research panels.
- Public synthetic mode is reproducible without sign-in. Private mode shows only current saved workspace data.
- Users can refresh the plan, search source-backed document excerpts, ask a question, inspect references and export a JSON review plan. Citations are record IDs or current PDF version/page references.
- The API returns `Cache-Control: no-store`; no new writes or external network research are performed by GET.
- **No new database schema, credentials, vector service or supplier terms changes** in this phase.

### Acceptance and reproducible demonstration

Run the full repo gates:

```sh
cd apps/web
npm ci
npm test
npx tsc --noEmit
npm run build
npm run eval:phase6
npm run eval:phase7
```

`eval:phase7` uses **fictional** electronics evidence and reports citation linkage, quote coverage, task count, approvals required and repeatability. It expressly does not evaluate real supplier accuracy, actual PDF ingestion or deployed workspace isolation.

The new staging acceptance script exercises the *real authenticated server* without writing by default. Obtain **disposable staging** session credentials and BOM IDs; never put credentials in Git or build logs.

```sh
NEXUS_STAGE_BASE_URL=https://nexus-staging.example.com \
NEXUS_STAGE_COOKIE='<redacted session cookie>' \
NEXUS_STAGE_WORKSPACE_ID='<workspace UUID>' \
NEXUS_STAGE_OTHER_WORKSPACE_ID='<other workspace UUID>' \
NEXUS_STAGE_BOM_ID='<saved staging BOM UUID>' \
NEXUS_STAGE_BOM_REVISION=1 \
npm run acceptance:phase7
```

Checks: anonymous 401 on private routes; real same-workspace access; forged workspace ID 409; stale revision 409; no automatic actions; every returned agent citation exists in the available evidence; optional second-tenant session validates denial. Production hostname is explicitly rejected.

**Optional writable staging acceptance (only with a disposable BOM):** supply `NEXUS_STAGE_ALLOW_WRITES=true`, `NEXUS_STAGE_PDF_PATH=/path/to/lawfully-obtained-text.pdf`, `NEXUS_STAGE_BOM_LINE=0`, and optionally `NEXUS_STAGE_PDF_V2_PATH` and `NEXUS_STAGE_PDF_SEARCH_QUERY`. This adds an actual text-layer PDF persistence/versioning/search test. Uploaded source bytes are not retained after extraction but **extracted text remains in staging** by design. You must separately test deletion and actual two-user tenant isolation before allowing customer production PDF uploads.

### Operating boundaries and risk assessment

- Supplier terms, robots/access restrictions, rate limits and operator-approved URL policies apply even to a noncommercial prototype. The agent never turns a missing quote into an unsolicited crawl.
- The agent's urgency values are deterministic prioritization weights. No empirical risk calibration or yield/savings prediction has been performed.
- Engineering compatibility still requires validated manufacturer datasheets, electrical testing and human approval. Matching printed parameter text is insufficient.
- Existing user-provided PDF text remains in the tenant's database, not an original PDF object store. Keep vendor intellectual property and retention controls in scope.
- For this release the acceptance script is a **harness**, not proof that a real production upload has succeeded. The signed-in acceptance run must be executed against a real staging environment by an authorized operator.
- CI passing does not imply a partner supplier feed is licensed or the optional scheduled SmartCrawl cron is active.

## Portfolio proof points

Explain how Nexus makes procurement recommendations *auditable*: traceable evidence records, exact version/page citations, bounded tenant-scoped retrieval, conservative uncertainty classifications, a deliberate approval boundary and reproducible test metrics. Present these as real engineering controls; disclose which demonstrations are synthetic and which production integrations have been independently exercised.
