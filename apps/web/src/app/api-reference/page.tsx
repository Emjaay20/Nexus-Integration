import Link from "next/link";
const endpoints = [
  {
    path: "/api/health",
    method: "GET",
    text: "Returns service reachability and supplier credential configuration. HTTP 503 indicates a degraded service.",
  },
  {
    path: "/api/platform-core/api/v1/bom/enrich",
    method: "POST",
    text: "Enrich 1–25 manufacturer part numbers in public Studio. Larger saved BOMs use authenticated workspace jobs. Returns live/reference provenance, warnings, offers, and heuristic risk scores when sufficient inputs exist.",
    body: { mpns: ["STM32F401RET6"], target_batch_size: 1000 },
  },
  {
    path: "/api/platform-core/api/v1/bom/parse",
    method: "POST",
    text: "Parse CSV, tab-delimited, or semicolon-delimited BOM content. Named headers can appear in any order. Invalid or missing quantities are rejected.",
    body: {
      raw_content:
        "MPN,Quantity,Manufacturer\nSTM32F401RET6,10,STMicroelectronics",
    },
  },
  {
    path: "/api/platform-core/api/v1/ml/semantic-search",
    method: "POST",
    text: "Search reference catalog candidates by text similarity. Results are not engineering-qualified replacements.",
    body: { query: "STM32F401RET6 LQFP-64", top_k: 4 },
  },
  {
    path: "/api/platform-core/api/v1/agent/profile-query",
    method: "POST",
    text: "Review SQL text for tenant predicates and common query anti-patterns. Does not execute the query.",
    body: {
      sql_query: "SELECT mpn FROM bom_items WHERE tenant_id = $1 LIMIT 100;",
    },
  },
  {
    path: "/api/bom/upload",
    method: "POST",
    text: "Session required. Upload multipart/form-data with a file field. Accepts CSV/Excel up to 5MB and 500 rows.",
  },
];
export default function ApiReference() {
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">DOCUMENTATION / API</div>
        <h1>A direct line to the platform.</h1>
        <p>
          Same-origin JSON endpoints used by the Nexus workspace. Try the
          sourcing tools in Studio.
        </p>
      </header>
      <div className="docs-layout">
        <nav className="toc" aria-label="API navigation">
          <h4>Resources</h4>
          <Link href="/platform-core">Open Studio ↗</Link>
          <Link href="/docs">Architecture & methodology</Link>
          <Link href="/status">Service status</Link>
        </nav>
        <article className="doc-body">
          <div className="note">
            Send JSON with Content-Type: application/json, except file uploads.
            Reference prices are illustrative. The risk_score field is a
            heuristic from 0 to 1, not a stock-out probability.
          </div>
          {endpoints.map((e) => (
            <section key={e.path}>
              <h2 style={{ fontSize: 21, overflowWrap: "anywhere" }}>
                <span
                  className="tag"
                  style={{ marginLeft: 0, marginRight: 10 }}
                >
                  {e.method}
                </span>
                <span className="mono" style={{ fontSize: 15 }}>
                  {e.path}
                </span>
              </h2>
              <p>{e.text}</p>
              {e.body && (
                <code className="blk">{JSON.stringify(e.body, null, 2)}</code>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
