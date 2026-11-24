# Nexus Regional Market — Phase 2 candidate (review before deployment)

Baseline `dd2b4094498745846f17be295c088fae273d890c`. These files add optional supplier-feed preview and reference FX lookup to the existing **one-BOM-line** regional sourcing workflow. They do **not** change the existing Rust and Go sourcing workers, schema, privileged operations, payments or live supplier sites.

## Scope delivered

- `GET /api/regional-sourcing/market?base=USD&quote=NGN`: authenticated, DB-budgeted lookup of a **reference** FX rate. For conversions involving NGN, use Frankfurter v2's CBN provider route; otherwise use its blended reference rate. Source URL, observation date and retrieval timestamp are returned. Provider failure, invalid pairs, stale publication (>8 days), large responses and invalid payloads fail closed. No fallback number is fabricated. No executable FX or customs tariff rate is implied.
- `POST /api/regional-sourcing/market` with `action=feed_preview`: authenticated, owner/engineer-only lookup of a **licensed, preconfigured supplier-owned JSON feed**, scoped to a saved, current BOM revision, component and destination. Membership is checked against PostgreSQL in a transaction before network access. Exact part number, manufacturer, country, price, stock, MOQ, expiry and supplier product origin are validated. Up to five candidate offers are returned; no quote/transaction is created automatically.
- UI: use a vetted FX rate as a **draft** conversion input with provenance appended to the quote reference, or populate the manual quote form from a partner feed candidate. Identity/delivery attestations, shipping/fees and quote expiry require renewed user review. The existing quote sorting still excludes incomplete/expired offers.
- Tests: independent feed/FX contract tests and mocked market API authorization tests.

## Production safety switches (all OFF by default)

```dotenv
NEXUS_REGIONAL_FX_ENABLED=false
NEXUS_REGIONAL_FEEDS_ENABLED=false
NEXUS_PARTNER_FEED_EGRESS_VERIFIED=false
NEXUS_REGIONAL_FEED_POLICIES={}
# Optional dedicated partner bearer token in secret store:
# NEXUS_PARTNER_FEED_TOKEN_<ID>=<secret>
```

FX reference source: https://frankfurter.dev/ and https://frankfurter.dev/providers/cbn/ . Provider terms and availability must be reviewed. **Do not** interpret official reference rates as settled payment prices; record actual commercial rate and bank fees for financial decisions. Rates are fetched only on explicit user action and are not stored as independent price history in this phase.

### Feed policy example (FICTIONAL, DO NOT ENABLE AGAINST REAL SUPPLIER)

```json
{
  "microscale": {
    "authorizationRef": "written-permission-record-ID",
    "url": "https://www.microscale.net/nexus-catalogue.json",
    "allowedCountries": ["NG"],
    "tokenEnv": "NEXUS_PARTNER_FEED_TOKEN_MICROSCALE"
  }
}
```

This is a shape demonstration only; there is **no** evidence that the illustrated endpoint exists or that this supplier authorizes collection. Microscale's published terms restrict scraping. Do not set this policy without written authorization and an actual supplier-provided feed. Use the same approach for Hub360, Matrix360 and other sources only after permission and contractual review. Egress controls must restrict the external request to approved partner hostnames/IP ranges at the infrastructure boundary, including DNS resolution and redirects, before an operator sets the attestation flag. Code checks exact registered HTTPS origin, does not follow redirects and enforces time/byte/entry limits, but application validation alone cannot prevent DNS rebinding.

**Partner JSON contract** (example values, not live offers):

```json
{
  "schemaVersion": 1,
  "supplierId": "microscale",
  "generatedAt": "2026-11-24T08:00:00.000Z",
  "products": [{
    "mpn": "ESP32-WROOM-32E",
    "manufacturer": "Espressif",
    "currency": "NGN",
    "unitPrice": "4500.50",
    "stock": 50,
    "moq": 1,
    "deliveryCountries": ["NG"],
    "validUntil": "2026-11-25T08:00:00.000Z",
    "sourceUrl": "https://www.microscale.net/products/example"
  }]
}
```

Require valid supplier publication date (last 72 hours), correct supplier ID, no more than 300 records, bounded payload (<500 kB), JSON content type and exact component manufacturer. A review candidate is **not** independently verified stock, a tax invoice, an authenticated quote, or a safety-qualified substitute. The current loader trusts the operator-approved supplier feed's HTTPS content; it does not verify a feed signature or cryptographically authenticate the publisher. If supplier-side signature verification is needed, add it before enabling high-trust downstream workflows. Do not treat supplier or LLM text as instructions.

## Acceptance gates

1. Run the existing CI (`npm test`, `npx tsc --noEmit`, `npm run build`, Rust/Postgres integration and Kubernetes verification) on a feature branch. `NODE_PATH=$(npm root -g) node --test apps/web/tests/regional-market*.unit.test.mjs` runs the added mocked tests if TypeScript is global. No migrations are added by this patch.
2. Apply against the baseline or reconcile any newer source with a real diff. Do not merge straight to production without code review.
3. In staging: verify a fresh owner, engineer, viewer, two distinct workspaces, stale BOM revision, all rate-limit responses, exact MPN matching, stale and malformed partner feed, no automatic quote rank, null shipping, and no secret exposure.
4. Operator may enable FX after confirming Frankfurter provider availability, the actual response shape, freshness, provider attribution and an outage fallback to **manual** rate entry (not a fabricated number). Record how the rate differs from the actual foreign exchange payment rate.
5. Partner feed remains OFF until written source permission, secret management, egress isolation, independent integration tests and manual catalogue checks have been completed. Do not automate scraping of Microscale, Hub360, Alibaba or other websites on the basis of public availability alone.
6. Live AetherHost checks: verify the expected Git SHA, migration status, `/ready` worker counters, `/api/health`, `/regional-sourcing`, authentication and real manual customer quotation. This patch does not itself establish a new production deployment.

## Deferred for next phase

Full-BOM multiple-supplier optimisation (with shared shipping, tiered prices and split orders), approval workflows, signed partner feeds, VAT/customs schedules, provider FX persistence/cache, supplier lifecycle updates, RFQ exchange, PDF datasheets, RAG and engineering-qualified substitutes.
