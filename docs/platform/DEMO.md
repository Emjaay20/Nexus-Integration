# Five-minute platform engineering demonstration

1. Run `make doctor`, then `make dev`. Explain how one command supplies isolated storage, migrations, fixture-only supplier data, and shared local configuration.
2. Open `/workspace` as a registered local owner. Save a BOM with reordered CSV columns. Open it, edit it, and show the revision increasing.
3. Use a second account. Before membership is granted, request the first BOM: access is denied without revealing whether it exists. Add the second account as a viewer from Permissions, select the shared workspace there, and show read access with editing disabled. Change it to engineer, save a revision, then revoke the role. The next request immediately uses the new database role.
4. Enrich a saved revision. Show its durable job progress, quantity-aware supplier results, explicit reference data labels, and request ID. Explain the crash-recovery and cancellation tests; do not claim exactly-once processing.
5. Open Audit trail. Relate a denied operation, a role change, and a saved revision to the corresponding request IDs.
6. Run `make mcp-test` to show an agent-compatible tool connection without granting shell or database execution. Demonstrate one parsed BOM and one advisory query review.
7. Show `.nexus/evidence/rolling-update.json` and `rollback.json` from `make k8s-verify`, the tested image digest from CI, and the measured parsing benchmark. Discuss hardware, dataset, failure cases, and limits before quoting numbers.

Useful tradeoffs to explain:

- Why authoritative Rust services derive roles from storage rather than accepting a browser-supplied tenant/role.
- Why policy checks and SQL scoping are independent safeguards.
- Why optimistic revisions prevent lost updates.
- Why Postgres leases suit this workload, and when a dedicated queue would become appropriate.
- Why a lease needs a fencing token and a maximum attempt count.
- Why a correct deployment manifest needs an executed rollout/rollback test.
- Why correlation IDs are useful while still being different from an OpenTelemetry exporter.

Use this as evidence of your implementation and reasoning. Describe your own production experience and time spent using Rust accurately; a portfolio deployment is not a substitute for operating a service over time.
