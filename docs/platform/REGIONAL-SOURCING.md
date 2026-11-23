# Regional sourcing — first vertical slice

## Purpose and boundaries

Nexus owns BOMs, workspace authorization, source policies, procurement calculations and saved evidence. SmartCrawl remains a general-purpose retrieval service. Users do not need distributor credentials for directory discovery and manual quotations. The existing Go distributor ingestion and Rust job worker remain unchanged. This feature is additive; it does not fix the earlier Rust worker readiness fault or remove the older simulated Integration Hub.

This release provides one BOM-line comparison at a specific saved revision, destination country and requested total quantity. It does not represent full-BOM optimisation, live supplier inventory, licensed reseller partnerships, local pickup verification or confirmed international delivery. Supplier names and homepages are initial research candidates. Users can record genuine quotations obtained via supplier websites, phone, WhatsApp or RFQs; they are explicitly **customer-reported**. No orders, payments, messages or quotes are submitted to suppliers automatically.

## Operator configuration

Manual quoting requires working existing Nexus authentication, authoritative Rust workspace context, the `platform_request_limits` table and the new SQLx migration `202611220003_regional_sourcing.sql`. No SmartCrawl or model credentials are required. Review migration in a disposable database first and apply by the existing SQLx migration runner. Never reset production or mark a migration applied without checking the schema.

Automated collection is disabled by default. Before enabling any supplier:

1. Record actual written permission or applicable licensed access, allowed product URLs, allowed collection/storage cadence and model processing rights. Public visibility is not permission. Microscale's published terms restrict scraping; Alibaba/other marketplace services require their own access review. Prefer approved feeds and official APIs. No example policy authorizes a real supplier.
2. Verify a staging SmartCrawl instance with user-key authentication, persistent job storage, outbound SSRF protections, exact allowed destination hosts (including redirect enforcement), and no browser or third-party proxy escalation. Nexus checks returned final URL and rejects redirected evidence, but a server-side response check alone cannot prevent the crawler from reaching redirect destinations. Enforce egress restrictions at the crawler/network boundary before enabling. Do not enable this feature if that requirement cannot be demonstrated.
3. Create a dedicated revocable, bounded SmartCrawl key; do not use an admin key, share it with the frontend or reuse a guest-demo identity. Verify that jobs cannot be retrieved by unrelated API keys. Start with one permitted fixture/source and low quotas.
4. Supply server-only environment settings (see below). Ensure the web deployment receives them; do not embed them in builds, Next public variables, git or logs.

```dotenv
# Safe default; manual mode still works.
NEXUS_REGIONAL_SMARTCRAWL_ENABLED=false
NEXUS_SMARTCRAWL_CATALOG_EGRESS_VERIFIED=false
NEXUS_SMARTCRAWL_URL=https://smart-crawler.aetherhost.app
# NEXUS_SMARTCRAWL_API_KEY=... injected from protected secret store
NEXUS_REGIONAL_CRAWL_POLICIES={}
NEXUS_REGIONAL_LLM_ENABLED=false
# GROQ_API_KEY and GROQ_MODEL use the existing server-side convention.
```

Policy object format (documentation only; do not enable without real permission): `{"supplier-id":{"authorizationRef":"recorded grant reference","pathPrefixes":["/products/"],"allowModel":false}}`. IDs come from `model.ts`. Prefixes must be explicit directory paths, not `/`; only exact registered HTTPS origins and query-free product URLs are accepted. An origin change must be reviewed in source. Model requests also require an explicit customer opt-in for the particular submission and permission in the supplier policy. The selected part number and a bounded excerpt (12,000 characters) are sent to the configured Groq endpoint; not the whole BOM, workspace identity or crawler key. Public text is untrusted: the model has no tools and outputs an exact four-field candidate with a verbatim supporting excerpt. Candidate fields are not treated as facts or compatible parts and never enter cost ranking automatically. Failed or malformed outputs fall back to an unstructured review record.

## Data flow and failure semantics

`/workspace` → `/regional-sourcing` → `/api/regional-sourcing` → existing authenticated Rust context bridge → scope-checked PostgreSQL operations → SmartCrawl `/v1/scrape` and `/v1/jobs/:id` if explicitly enabled.

New PostgreSQL records contain immutable BOM line identity/revision, country, total quantity, supplier and request fingerprint. Membership and active workspace are checked within transactions; write requires owner/design_engineer and excludes the shared demo user. The selected workspace ID is a concurrency guard, not an identity assertion. Writes audit the reservation; terminal research results audit state changes. The new route does not access legacy organization roles. GET results exclude crawler credentials/job IDs/internal policy reference and are no-store. Only the current BOM revision is selectable. Saved older revisions are retained for a future history UI.

Submission is reserved and committed before the HTTP request. Unique `(workspace_id, request_key)` and transaction advisory lock prevent duplicate reservation; the same key with a different payload conflicts. Unresolved research for the same selection/supplier/URL blocks a new key. An ambiguous HTTP outcome stays `submission_unknown`; a process crash can leave `submitting`. Never automatically replay either. An operator must inspect SmartCrawl's authenticated job history, reconcile the exact request or mark failure after verifying it did not run. No automatic recovery of ambiguous submissions or admin reconciliation UI is supplied. Same-key retries return the existing record (within configuration and validation gates). A successful submit records the upstream job ID. User clicks **Check research status** to poll; an expiring 45-second fenced lease limits concurrent polls and model requests. This is not exactly-once distributed delivery. Existing Go/Rust sourcing jobs remain separate.

Research limits: 10 reserved research entries/workspace per rolling 24h, 100 manual quotes/workspace per rolling 24h; database-backed request budgets for reads, writes and global submissions/polls; global submit budget counts attempts including repeated requests. A single source page is fetched by the local HTTP provider, without JS rendering or retry; SmartCrawl responses are bounded at 1.5 MB. Job ID/page identity, successful HTTP status, no redirects, HTTP engine and completion timestamp are checked before extraction. The hash identifies the returned HTML (or markdown fallback), not an independently notarized source. Raw page content is not stored in Nexus. SmartCrawl's own retention and access policies still apply.

### Landed cost

`(unit_price × requested_quantity + total_shipping + total_duties_and_fees) × user_supplied_FX_rate`, all source costs in the quoted currency. Unit price: 4 decimals; shipment/fee amounts: 2; FX: 6. Integer BigInt arithmetic, half-up rounding to destination minor units. Same-currency FX = 1. No live FX feed or customs estimation in this release. Metadata records quote reference and user-entered FX reference; validity, exact quantity, stock, MOQ, identity and destination confirmation must pass. Unknown values remain null, not zero. Unit price must be positive. Estimates do not include unrecorded costs, delivery commitments or authenticity guarantees. Rank only complete quotations; user must refresh for updated validity. Directory regional-first ordering is based on candidate region metadata, not seller location or shipping proof.

## Acceptance gate before main/production

- Apply earlier Nexus hardening separately; investigate actual worker claim error. No reliance on green `/ready` alone.
- Install on a feature branch, review migration, run full existing CI and `apps/web` strict typecheck/build. Ensure migration is applied by Rust before opening the new page. No automatic production deployment.
- Use at least two fresh non-admin accounts/workspaces and a viewer. Create BOMs, record manual quotes, attempt stale revisions/cross-tenant IDs and concurrent idempotency requests; verify no unauthorized read/write, correct transaction rollback and audit. Verify real PostgreSQL advisory locks and fenced refresh under races and process restarts. Test expired, blank, stock shortage, wrong MOQ and multi-currency cost examples.
- Run mocked tests in CI, then test one explicitly permitted fixture page with real SmartCrawl in staging: authenticated submit→pending→complete, missing data, timeout and lost-response cases, harmful redirect blocked before fetch, model opt-in off/on, and malicious page instructions ignored. Verify request count, exact source timestamp, evidence and no automatic ranking. Validate data retention and operator reconciliation prior to wider release.
- Confirm health, metrics, deploy revision, schema and public navigation. Backup and recover one disposable workspace, including regional records, before commercial use. Do not perform active tests against real suppliers without permission.

## Deferred scope

Approved supplier feeds and APIs, supplier portal, search/discovery of exact product URLs, additional cities and countries, RFQ import/export and supplier responses, multi-line BOM planning, mixed-supplier/MOQ/price-break optimisation, real FX and landed-cost tariff integrations, manufacturer PDF datasheets, lifecycle monitoring, supplier verification, approvals, automated research scheduling/retention and RAG. The current research refresh is user-driven; no automatic follow-up or autonomous purchases.
