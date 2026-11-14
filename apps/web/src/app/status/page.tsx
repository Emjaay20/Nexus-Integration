import Link from "next/link";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
async function probe(url: string) {
  const start = performance.now();
  try {
    const r = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return {
      online: r.ok,
      ms: Math.round(performance.now() - start),
      data: await r.json(),
    };
  } catch {
    return {
      online: false,
      ms: Math.round(performance.now() - start),
      data: null,
    };
  }
}
export default async function Status() {
  const [rust, go, database] = await Promise.all([
    probe(`${process.env.RUST_BACKEND_URL || "http://127.0.0.1:8088"}/health`),
    probe(`${process.env.GO_INGEST_URL || "http://127.0.0.1:8090"}/health`),
    (async () => {
      const start = performance.now();
      try {
        await db.query("SELECT 1");
        return { online: true, ms: Math.round(performance.now() - start) };
      } catch {
        return { online: false, ms: Math.round(performance.now() - start) };
      }
    })(),
  ]);
  const services = [
    {
      name: "Web application",
      detail: "Next.js workspace and API",
      online: true,
      ms: null,
    },
    {
      name: "Platform core",
      detail: "Rust parsing, policy evaluator, and sourcing scores",
      ...rust,
    },
    {
      name: "Distributor ingestion",
      detail: "Go worker pool and supplier connections",
      ...go,
    },
    {
      name: "Database",
      detail: "Accounts, BOM imports, and activity records",
      ...database,
    },
  ];
  return (
    <main id="main-content" className="wrap">
      <header className="pagehead">
        <div className="eyebrow">PLATFORM / STATUS</div>
        <h1>System status</h1>
        <p>
          Service reachability and supplier configuration, checked when you load
          this page.
        </p>
      </header>
      <section className="section">
        <div className="section-head">
          <h2>
            {services.every((s) => s.online)
              ? "All services operational."
              : "Some services need attention."}
          </h2>
          <Link className="btn btn-secondary btn-sm" href="/status">
            Refresh status
          </Link>
        </div>
        {services.map((s) => (
          <div className="int-row" key={s.name}>
            <div className="int-icon">{s.name[0]}</div>
            <div>
              <h3>{s.name}</h3>
              <p>{s.detail}</p>
            </div>
            <div className="int-meta">
              <span className="status-dot">
                <span className={`dot ${s.online ? "dot-green" : "dot-red"}`} />
                {s.online ? "Operational" : "Unavailable"}
              </span>
              {s.ms !== null && <span className="mono sub">{s.ms} ms</span>}
            </div>
          </div>
        ))}
        <div className="data-caption">
          <span>
            Checked {new Date().toISOString().replace("T", " ").slice(0, 19)}{" "}
            UTC
          </span>
          <span>
            Reachability checks are not historical uptime measurements.
          </span>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <h2>Supplier connections</h2>
            <p>
              Configured credentials allow lookups; successful authentication is
              checked during an actual enrichment.
            </p>
          </div>
          <Link className="textlink" href="/docs#data">
            Connection setup ↗
          </Link>
        </div>
        {[
          ["DigiKey", "digikey_v4"],
          ["Mouser", "mouser_v1"],
        ].map(([name, key]) => (
          <div className="int-row" key={key}>
            <div className="int-icon">{name.slice(0, 2)}</div>
            <div>
              <h3>{name}</h3>
              <p>
                {!go.online
                  ? "Ingestion service unavailable."
                  : go.data?.live_connectors?.[key]
                    ? "Credentials configured. Run an enrichment to verify access."
                    : "Credentials not configured. Reference catalog available for sample parts."}
              </p>
            </div>
            <span className="status-dot">
              <span
                className={`dot ${go.data?.live_connectors?.[key] ? "dot-green" : "dot-amber"}`}
              />
              {!go.online
                ? "Unknown"
                : go.data?.live_connectors?.[key]
                  ? "Configured"
                  : "Reference only"}
            </span>
          </div>
        ))}
        <div className="note" style={{ marginTop: 24 }}>
          Farnell is included only in the illustrative reference catalog. Risk
          scores are heuristic.{" "}
          <Link href="/docs#risk">Read the methodology.</Link>
        </div>
      </section>
    </main>
  );
}
