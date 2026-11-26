import Link from "next/link";
const sections = [
  ["origin", "Why Nexus exists"],
  ["overview", "Overview"],
  ["workflow", "Phase 1–7 workflow"],
  ["architecture", "Architecture"],
  ["data", "Supplier data"],
  ["risk", "Risk methodology"],
  ["alternatives", "Alternative candidates"],
  ["decisions", "Design decisions"],
  ["api", "API at a glance"],
  ["ecosystem", "Related projects"],
  ["contact", "FlowMeet handoff"],
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
          <h2 id="origin">The engineering problem behind Nexus</h2>
          <p>
            Nexus grew from an electronics procurement problem I encountered while developing
            my postgraduate research project, <strong>A Blockchain-Secure IoT Platform for Remote Patient Monitoring
            with Interpretable Health Forecasting</strong>. Building a sensor-based system required
            sourcing physical components. Fragmented catalogs, uncertain local availability,
            overseas shipping and exchange rates made a reproducible Bill of Materials difficult
            to price and compare.
          </p>
          <p>
            Nexus is my response as a computer and software engineer: a functional, evidence-aware
            software platform that investigates how distributed services, optimization algorithms,
            document provenance and explicit human review can support better engineering decisions.
            It is a separate research-inspired engineering project, not a clinical application or
            a claim of validated supplier-market coverage.
          </p>
          <p><Link href="/case-study">Read the full research-to-product story →</Link></p>
          <h2 id="overview">A connected sourcing workspace</h2>
          <p>
            Nexus helps engineering and procurement teams import Bills of
            Materials, compare component offers, and inspect sourcing risks. The
            Integration Hub tracks business-system connections and their
            activity.
          </p>
          <h2 id="workflow">From an engineering BOM to a reviewable sourcing decision</h2>
          <ol>
            <li><strong>Foundation:</strong> import, validate and version component requirements with tenant ownership.</li>
            <li><strong>Supplier and FX evidence:</strong> identify approved supplier sources, and distinguish quotations from reference or crawler observations.</li>
            <li><strong>Whole-BOM optimisation:</strong> compare local, international and mixed sourcing with stock, MOQ, shipping and supplier fixed-cost constraints.</li>
            <li><strong>Evidence intelligence:</strong> cite recorded observations, identify missing fields and keep unverified web research separate from supplier quotes.</li>
            <li><strong>Document workbench:</strong> extract text-layer PDF pages, record SHA-256 fingerprints and review potential engineering specification differences.</li>
            <li><strong>Persistent knowledge:</strong> retain opt-in extracted text, version history and tenant-scoped PostgreSQL page search; schedule narrow approved research.</li>
            <li><strong>Human-approved agent:</strong> produce deterministic, citation-grounded review tasks without automatically crawling, approving a substitute or making a purchase.</li>
          </ol>
          <p>
            <Link href="/regional-sourcing/planner">Whole-BOM planning →</Link> &nbsp;
            <Link href="/regional-sourcing/intelligence">Research and evidence →</Link>
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
          <h2 id="ecosystem">An independently inspectable engineering ecosystem</h2>
          <p>
            Nexus, AetherHost and FlowMeet are distinct projects, designed around related
            engineering practices rather than a fabricated single database or unified runtime.
            <strong> AetherHost</strong> provides a deployment and infrastructure case study.
            <strong> FlowMeet</strong> provides the separately authenticated lead-management and
            booking handoff used by Nexus enquiries. My separate <strong>Smart Content Fetcher</strong>
            plugin demonstrates adjacent web-data processing work; it is not the same deployment
            as the permission-controlled SmartCrawl research workflow inside Nexus.
          </p>
          <p>
            <a href="https://github.com/Emjaay20/AetherHost" target="_blank" rel="noopener noreferrer">AetherHost source ↗</a> &nbsp;
            <a href="https://github.com/Emjaay20/Flowmeet" target="_blank" rel="noopener noreferrer">FlowMeet source ↗</a> &nbsp;
            <a href="https://github.com/Emjaay20/Smart-Crawler-Plugin" target="_blank" rel="noopener noreferrer">Smart Content Fetcher source ↗</a> &nbsp;
            <a href="https://yusufsaka.dev" target="_blank" rel="noopener noreferrer">Engineering portfolio ↗</a>
          </p>
          <h2 id="contact">Contact and booking through FlowMeet</h2>
          <p>
            The Nexus homepage offers a FlowMeet booking handoff, modelled on the separate
            AetherHost marketing-site integration. Optional server-side contact capture posts a
            bounded, consented lead to FlowMeet with an API key kept only on the Nexus server;
            FlowMeet binds it to its authenticated workspace and deduplicates using the supplied
            request key. The form does not send a booking email or silently reserve a calendar slot.
          </p>
          <div className="note">
            Direct lead capture is off until a dedicated FlowMeet workspace key is configured.
            The booking CTA falls back to the existing shared founder calendar; use a dedicated
            Nexus slug only after provisioning it in FlowMeet. This is a portfolio integration,
            not an assertion that lead routing or appointment delivery has been validated for Nexus.
          </div>
          <p><Link href="/#contact">Contact the builder on Nexus →</Link></p>
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
