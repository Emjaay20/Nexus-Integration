import Link from "next/link";
const sections = [
  ["overview", "Overview"],
  ["architecture", "Architecture"],
  ["data", "Supplier data"],
  ["risk", "Risk methodology"],
  ["alternatives", "Alternative candidates"],
  ["decisions", "Design decisions"],
  ["api", "API at a glance"],
];
export default function Docs() {
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">DOCUMENTATION</div>
        <h1>Built to be understood.</h1>
        <p>
          How Nexus works, where the data comes from, and the decisions behind
          the platform.
        </p>
      </header>
      <div className="docs-layout">
        <nav className="toc" aria-label="On this page">
          <h4>On this page</h4>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <article className="doc-body">
          <h2 id="overview">A connected sourcing workspace</h2>
          <p>
            Nexus helps engineering and procurement teams import Bills of
            Materials, compare component offers, and inspect sourcing risks. The
            Integration Hub tracks business-system connections and their
            activity.
          </p>
          <h2 id="architecture">Three runtimes. Defined responsibilities.</h2>
          <p>
            The Next.js web application provides the workspace, authentication,
            and database-backed activity. Its API forwards sourcing requests to
            the Rust core, which delegates distributor lookups to the Go
            ingestion service.
          </p>
          <code className="blk">{`Browser → Next.js :3000\n            ├─ PostgreSQL: accounts, imports, activity\n            └─ Rust :8088: parsing, scoring, policy evaluation\n                 └─ Go :8090: concurrent supplier lookups\n                      ├─ DigiKey v4 (credentials required)\n                      ├─ Mouser v1 (API key required)\n                      ├─ Nexar GraphQL (credentials required)\n                      └─ Reference catalog (illustrative)`}</code>
          <h2 id="data">Know the source of every offer</h2>
          <p>
            Results tagged “Live API” come from a configured supplier
            connection. “Reference catalog” results are built-in examples with
            illustrative prices and stock levels. They are useful for exploring
            the platform, but must not be treated as current quotes.
          </p>
          <p>
            DigiKey requires DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET. Mouser
            requires MOUSER_API_KEY. Nexar requires NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET. Configure these as server environment
            secrets. Failed requests and missing credentials are reported in
            lookup details. Farnell entries are reference data; there is no live
            Farnell connector.
          </p>
          <div className="note">
            A service being online confirms reachability. It does not confirm a
            working supplier account, an authenticated distributor response, or
            current inventory.
          </div>
          <h2 id="risk">Explainable sourcing scores</h2>
          <p>
            The current engine uses hand-authored rules covering lead time,
            stock-to-demand ratio, supplier diversity, and lifecycle stage. It
            returns a relative score from 0 to 100, with contributing factors.
          </p>
          <p>
            This is a heuristic, not a trained gradient-boosted model or a
            calibrated stock-out probability. No accuracy, calibration, or
            lead-time forecasting performance has been established against real
            outcomes. Scores based on reference data are illustrative too.
          </p>
          <h2 id="alternatives">Candidates, not qualified replacements</h2>
          <p>
            Search uses deterministic 32-dimensional text features and cosine
            similarity against the reference catalog. Package matches and
            similarity scores help create a shortlist. They do not verify pin
            assignments, operating limits, firmware compatibility, or regulatory
            suitability. An engineer must review datasheets and qualify any
            replacement.
          </p>
          <h2 id="decisions">Design decisions</h2>
          <div className="adr-meta">ADR-001 / RUST CORE</div>
          <p>
            Keep parsing, policy simulation, and deterministic scoring together.
            This reduces serialization between related operations, at the cost
            of longer cold builds.
          </p>
          <div className="adr-meta">ADR-002 / GO INGESTION</div>
          <p>
            Keep external network requests in a separate process, with bounded
            concurrency and request timeouts. Supplier delays remain separate
            from CPU-bound core operations.
          </p>
          <div className="adr-meta">ADR-003 / PERMISSIONS</div>
          <p>
            ArcSwap publishes immutable policy snapshots to the evaluator. The
            Studio is a simulation tool. Application sessions and database
            ownership checks must independently enforce access; the SQL reviewer
            is advisory.
          </p>
          <div className="adr-meta">ADR-004 / TRANSPARENT BASELINE</div>
          <p>
            Use an inspectable heuristic until representative outcome data
            supports a trained and validated model. Keep provenance with each
            result and return an explicit error if the ingestion service is
            unavailable.
          </p>
          <h2 id="api">API at a glance</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Endpoint through web proxy</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["POST", "bom/enrich"],
                  ["POST", "bom/parse"],
                  ["POST", "authz/evaluate"],
                  ["POST", "ml/semantic-search"],
                  ["POST", "agent/profile-query"],
                ].map(([method, path]) => (
                  <tr key={path}>
                    <td className="mono">{method}</td>
                    <td className="mono">/api/platform-core/api/v1/{path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 20 }}>
            <Link href="/platform-core">Explore the Studio →</Link> &nbsp;{" "}
            <Link href="/status">Check system health →</Link>
          </p>
        </article>
      </div>
    </main>
  );
}
