"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Enrichment } from "@/components/platform/Enrichment";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
const tabs = [
  ["enrich", "BOM enrichment", "Offers & sourcing signals"],
  ["authz", "Policy evaluator", "Test access decisions"],
  ["vector", "Second-source search", "Discover alternative candidates"],
  ["agent", "SQL query review", "Inspect tenant predicates"],
  ["metrics", "Telemetry", "Service health & metrics"],
];
type Json = Record<string, unknown>;
async function request(path: string, body?: unknown) {
  const r = await fetch(
    `/api/platform-core/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!r.ok) throw new Error(data?.error || `Request failed (${r.status})`);
  return data;
}
function Studio() {
  const params = useSearchParams();
  const [tab, setTab] = useState(
    tabs.some((t) => t[0] === params.get("tab"))
      ? params.get("tab")!
      : "enrich",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Json | null>(null);
  const [health, setHealth] = useState<{
    daemons?: Record<string, string>;
    status?: string;
    suppliers?: Record<string, boolean>;
  } | null>(null);
  const [role, setRole] = useState("design_engineer");
  const [action, setAction] = useState("read");
  const [tenant, setTenant] = useState("acme-oem");
  const [owner, setOwner] = useState("acme-oem");
  const [nda, setNda] = useState(true);
  const [query, setQuery] = useState("STM32F401RET6 ARM Cortex-M4 LQFP-64");
  const [sql, setSql] = useState(
    "SELECT mpn, price FROM bom_items WHERE tenant_id = $1 LIMIT 100;",
  );
  const [metrics, setMetrics] = useState("");
  async function check() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      setHealth(await response.json());
    } catch {
      setHealth({ status: "offline" });
    }
  }
  useEffect(() => {
    check();
  }, []);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      if (tab === "authz")
        setResult(
          await request("api/v1/authz/evaluate", {
            subject: {
              user_id: "studio-preview",
              tenant_id: tenant,
              role,
              clearance: "confidential",
              attributes: {},
            },
            action,
            resource: {
              resource_id: "studio-bom",
              resource_type: "bom",
              tenant_id: owner,
              sensitivity: "confidential",
              attributes: {},
            },
            context: {
              current_time: new Date().toISOString(),
              nda_signed: nda,
              ip_address: "127.0.0.1",
            },
          }),
        );
      if (tab === "vector")
        setResult(
          await request("api/v1/ml/semantic-search", { query, top_k: 5 }),
        );
      if (tab === "agent")
        setResult(
          await request("api/v1/agent/profile-query", { sql_query: sql }),
        );
      if (tab === "metrics") {
        await check();
        setMetrics(await request("metrics"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete request.");
    } finally {
      setBusy(false);
    }
  }
  function choose(value: string) {
    setTab(value);
    setResult(null);
    setError("");
  }
  const matches = (result?.matches || []) as {
    entry: {
      mpn: string;
      manufacturer: string;
      description: string;
      package: string;
    };
    cosine_similarity: number;
    package_match: boolean;
  }[];
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">WORKSPACE / STUDIO</div>
        <h1>Platform Core Studio</h1>
        <p>
          A direct view into the sourcing engine. Enrich parts, explore
          alternatives, and inspect decisions.
        </p>
      </header>
      <div className="studio-layout">
        <aside className="sidebar" aria-label="Studio tools">
          <h4>Tools</h4>
          {tabs.map(([value, label, sub], i) => (
            <button
              key={value}
              className={`side-item ${tab === value ? "active" : ""}`}
              aria-pressed={tab === value}
              onClick={() => choose(value)}
            >
              <span className="side-num">0{i + 1}</span>
              <span>
                {label}
                <small>{sub}</small>
              </span>
            </button>
          ))}
          <div
            className="note"
            style={{ margin: "24px 8px 0", fontSize: 12, padding: 10 }}
          >
            <span className="status-dot">
              <span
                className={`dot ${health?.status === "healthy" ? "dot-green" : "dot-amber"}`}
              />
              {health?.status === "healthy"
                ? "Services online"
                : health
                  ? "Service degraded"
                  : "Checking services"}
            </span>
          </div>
        </aside>
        <div className="studio-main">
          <section className="studio-panel">
            {tab === "enrich" && (
              <>
                <div className="eyebrow">01 / SOURCING</div>
                <h2>BOM enrichment</h2>
                <p className="lede">
                  Check stock and quantity price breaks. Each result identifies
                  its source and explains any limits on the data.
                </p>
                <Enrichment />
              </>
            )}
            {tab === "authz" && (
              <>
                <div className="eyebrow">02 / PERMISSIONS</div>
                <h2>Policy evaluator</h2>
                <p className="lede">
                  Simulate a role, tenant, and resource to see how the
                  permission engine decides. This tool evaluates hypothetical
                  access; it does not grant permissions.
                </p>
                <form onSubmit={run}>
                  <div className="form-grid">
                    <label className="field">
                      Your tenant
                      <select
                        value={tenant}
                        onChange={(e) => setTenant(e.target.value)}
                      >
                        <option value="acme-oem">Acme OEM</option>
                        <option value="buildright-ems">BuildRight EMS</option>
                      </select>
                    </label>
                    <label className="field">
                      Role
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="design_engineer">Design engineer</option>
                        <option value="procurement_manager">
                          Procurement manager
                        </option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <label className="field">
                      Action
                      <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                      >
                        {["read", "write", "export_pricing", "delete"].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="field">
                      Resource owner
                      <select
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                      >
                        <option value="acme-oem">Acme OEM</option>
                        <option value="buildright-ems">BuildRight EMS</option>
                      </select>
                    </label>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 20,
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={nda}
                      onChange={(e) => setNda(e.target.checked)}
                    />{" "}
                    NDA signed
                  </label>
                  <RunButton busy={busy}>Evaluate policy</RunButton>
                </form>
                {result && (
                  <div
                    className={`note result-section ${result.decision === "allow" ? "" : "warning"}`}
                    role="status"
                  >
                    <strong>
                      Decision: {String(result.decision ?? "Complete")}
                    </strong>
                    <p>{String(result.reason ?? "")}</p>
                    <details>
                      <summary>Decision details</summary>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </>
            )}
            {tab === "vector" && (
              <>
                <div className="eyebrow">03 / ALTERNATIVES</div>
                <h2>Second-source search</h2>
                <p className="lede">
                  Search the reference catalog by part number, package, or
                  description. Similarity helps you shortlist candidates.
                </p>
                <div className="note warning" style={{ marginBottom: 20 }}>
                  Candidates require engineering review. A matching package or
                  similarity score does not establish electrical or pin
                  compatibility.
                </div>
                <form onSubmit={run}>
                  <label className="field">
                    Part number or description
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      required
                      maxLength={500}
                    />
                  </label>
                  <RunButton busy={busy}>Search alternatives</RunButton>
                </form>
                {result && (
                  <div className="result-section">
                    {matches.length ? (
                      matches.map((m) => (
                        <div className="sim-row" key={m.entry.mpn}>
                          <div>
                            <strong className="mpn">{m.entry.mpn}</strong>
                            <span className="sub">
                              {m.entry.manufacturer} · {m.entry.package}
                            </span>
                            <p
                              style={{
                                fontSize: 13,
                                color: "var(--muted)",
                                marginTop: 6,
                              }}
                            >
                              {m.entry.description}
                            </p>
                          </div>
                          <div className="mono" style={{ fontSize: 13 }}>
                            {(m.cosine_similarity * 100).toFixed(1)}% similarity
                            <span className="sub">
                              {m.package_match
                                ? "Package match"
                                : "Review package"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        No candidates found. Try a broader description.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {tab === "agent" && (
              <>
                <div className="eyebrow">04 / QUERY REVIEW</div>
                <h2>SQL query review</h2>
                <p className="lede">
                  Inspect a query for missing tenant filters and unbounded
                  results. Static checks are advisory; they do not execute SQL
                  or enforce database access.
                </p>
                <form onSubmit={run}>
                  <label className="field">
                    SQL query
                    <textarea
                      rows={7}
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      required
                      spellCheck={false}
                    />
                  </label>
                  <RunButton busy={busy}>Review query</RunButton>
                </form>
                {result && (
                  <pre
                    className="note result-section"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </>
            )}
            {tab === "metrics" && (
              <>
                <div className="eyebrow">05 / OBSERVABILITY</div>
                <h2>Service telemetry</h2>
                <p className="lede">
                  Current service health and counters from the Rust core.
                  Refresh to retrieve the latest measurements.
                </p>
                <div className="metric-row">
                  {Object.entries(health?.daemons || {}).map(
                    ([name, status]) => (
                      <div className="metric" key={name}>
                        <b style={{ fontSize: 17 }}>{status}</b>
                        <span>{name.replaceAll("_", " ")}</span>
                      </div>
                    ),
                  )}
                </div>
                <form onSubmit={run}>
                  <RunButton busy={busy}>
                    <RefreshCw size={14} /> Refresh metrics
                  </RunButton>
                </form>
                {metrics && (
                  <pre
                    className="note result-section"
                    style={{ overflowX: "auto", fontSize: 12 }}
                  >
                    {metrics}
                  </pre>
                )}
              </>
            )}
            {error && (
              <p className="note error result-section" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
function RunButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="form-actions">
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? (
          <Loader2 className="animate-spin" size={15} />
        ) : (
          <ArrowRight size={15} />
        )}{" "}
        {children}
      </button>
    </div>
  );
}
export default function StudioPage() {
  return (
    <Suspense fallback={<main className="wrap section">Loading Studio…</main>}>
      <Studio />
    </Suspense>
  );
}
