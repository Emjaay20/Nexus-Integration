# Phase 3 — Whole-BOM procurement planner (proof of concept)

## Implemented
- Customer-facing planner at /regional-sourcing/planner, linked from the existing Regional Sourcing page.
- Public **synthetic** 5-line and 50-line demonstrations, with explicitly fictional suppliers; no live supplier prices are claimed.
- Authenticated, read-only GET /api/regional-sourcing/plan that retrieves customer-reported quotes for the current BOM revision from the existing regional sourcing table. Workspace membership and current workspace are rechecked in PostgreSQL. No new migrations.
- Three strategies: local suppliers, international suppliers, and mixed; per-line allocations, fixed supplier fees and quantity price breaks.
- BigInt fixed-point arithmetic, explicit FX inputs, source evidence labels, stock/MOQ/quoted-quantity bounds, expiry and part number/manufacturer matching. No missing cost is treated as zero.
- User-editable, validated custom scenario JSON. It runs locally in the browser and is not saved or sent to third parties by the planner.
- Evidence-labelled CSV export with spreadsheet-formula escaping. No orders or payments.

## Exact and heuristic
For at most 12 BOM lines, five suppliers, a maximum quantity of 80 per line, and 120 offers, the optimiser enumerates supplier subsets and uses per-line integer dynamic programming. This is an exact minimum only **within the entered prices and constraints**. It does not validate commercial quote authenticity, enforce electrical compatibility, or guarantee future prices.

For bigger scenarios (including 50 lines), a labelled heuristic uses bounded per-line DP, one- and two-supplier combinations, then a safe greedy fallback. It may miss a better or even a feasible plan. Only full allocated quantity counts as complete; incomplete variants have no valid total or recommendation.

Saved customer quotations apply only to their **exact quoted quantity**. This avoids assuming that a 10-piece quote applies to five pieces. The per-line shipping/tax charges are counted for every saved quote. No unverified freight consolidation discounts are inferred. Synthetic scenarios separately support explicit supplier-wide fixed costs.

## SmartCrawl fallback
The planner lists uncovered parts and directs the user back to the existing Regional Sourcing screen, which can research an **exact authorised** supplier URL via SmartCrawl. Research observations and LLM candidates remain review-required; they never become ranked quotes automatically. The planner does not autonomously crawl supplier sites, and a noncommercial demo does not waive supplier terms.

## Demonstration
1. Open /regional-sourcing/planner and run the 5-line synthetic demo without logging in; inspect all three strategies.
2. Run the 50-line demo and verify its Heuristic classification; export evidence-labelled CSV.
3. Edit the custom JSON scenario: reduce stock, add a price-break, remove required fees; rerun and inspect coverage.
4. Sign in as a real workspace owner; create a BOM and record exact-quantity quotations in /regional-sourcing. Load these saved quotes in the planner and verify they are treated as customer-reported.
5. As another tenant or viewer, verify read-only access and workspace-scoped data; reject stale revisions and tampered workspace IDs.
6. In staging, run normal CI, typecheck, build and real PostgreSQL integration. Check that Phase 1 and 2 still work after deployment.

## Deferred
Actual licensed supplier data, partner feeds where credentials are absent, VAT/duty determination, real shipping consolidation contracts, purchase orders, automatically scheduled legal crawls, engineering-qualified substitutions, signed feed attestation and predictive ML. No new production credentials or schema changes are required.
