import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  FileSpreadsheet,
  Search,
  ListChecks,
} from "lucide-react";
import { Enrichment } from "@/components/platform/Enrichment";
const architecture = [
  {
    tag: "01 / RUST · PLATFORM CORE",
    title: "One place for the decisions that matter.",
    body: "Part-number normalization, sourcing scores, and permission evaluation share a single core. Consistent results, with the contributing risk factors available for inspection.",
    meta: "Actix-Web · ArcSwap",
    href: "/platform-core?tab=authz",
    link: "Explore policy evaluation",
  },
  {
    tag: "02 / GO · DISTRIBUTOR INGESTION",
    title: "Supplier lookups, without the bottleneck.",
    body: "A bounded worker pool queries configured DigiKey, Mouser and Nexar connections in parallel. Every result tells you whether it came from a live supplier or the reference catalog.",
    meta: "Go · Concurrent workers",
    href: "/platform-core",
    link: "Run an enrichment",
  },
  {
    tag: "03 / TYPESCRIPT · YOUR WORKSPACE",
    title: "From a messy spreadsheet to a clear next step.",
    body: "Import a BOM, map its columns, and resolve validation issues. Track integration activity and keep a record of what happened across your connected systems.",
    meta: "Next.js · PostgreSQL",
    href: "/bom-importer",
    link: "Import your first BOM",
  },
];
export default function Home() {
  return (
    <main id="main-content">
      <div className="wrap">
        <section className="hero">
          <div className="hero-label">Electronics sourcing, with context</div>
          <h1>
            Every part. Every price.
            <br />
            <em>A clearer path to your next build.</em>
          </h1>
          <p className="hero-sub">
            Turn your Bill of Materials into a sourcing plan. Compare supplier
            offers, surface supply risks, and find candidates for a second
            source — in one connected workspace.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href="/platform-core">
              Open Studio <ArrowUpRight size={17} />
            </Link>
            <Link className="btn btn-secondary" href="/bom-importer">
              <FileSpreadsheet size={17} /> Upload a BOM
            </Link>
          </div>
          <p className="hero-stack">
            Built for the work between engineering and procurement.
          </p>
          <div className="statrow">
            <div className="stat">
              <b>One workspace</b>
              <span>
                Import, validate, and source
                <br />
                without losing the context.
              </span>
            </div>
            <div className="stat">
              <b>Parallel lookups</b>
              <span>
                DigiKey, Mouser & Nexar APIs
                <br />
                when credentials are configured.
              </span>
            </div>
            <div className="stat">
              <b>Explainable scores</b>
              <span>
                See the factors behind
                <br />
                each sourcing risk flag.
              </span>
            </div>
            <div className="stat">
              <b>Traceable data</b>
              <span>
                Live offers and reference data,
                <br />
                clearly distinguished.
              </span>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">01 — THE WORKFLOW</div>
              <h2>A better starting point for every quote.</h2>
              <p>
                Spend less time reconciling spreadsheets. Spend more time
                resolving the parts that need your attention.
              </p>
            </div>
            <Link className="textlink" href="/bom-importer">
              Start an import{" "}
              <ArrowRight size={14} style={{ display: "inline" }} />
            </Link>
          </div>
          <div className="process-strip">
            {[
              {
                icon: FileSpreadsheet,
                title: "Bring your BOM",
                text: "Upload CSV or Excel. Map your columns and catch missing part numbers or invalid quantities.",
              },
              {
                icon: Search,
                title: "Check your options",
                text: "Compare stock, lead times, and quantity price breaks. Know exactly where each result came from.",
              },
              {
                icon: ListChecks,
                title: "Make an informed decision",
                text: "Review sourcing signals and alternative candidates before committing to a quote.",
              },
            ].map((s, i) => (
              <div key={s.title}>
                <span className="eyebrow">
                  0{i + 1} &nbsp;{" "}
                  <s.icon
                    size={16}
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />
                </span>
                <b>{s.title}</b>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="section" style={{ paddingTop: 10 }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">02 — SEE IT IN PRACTICE</div>
              <h2>Know what you’re quoting.</h2>
              <p>
                Try a small BOM against the running sourcing engine. Replace the
                sample parts with your own to explore.
              </p>
            </div>
            <Link href="/platform-core" className="textlink">
              Full Studio{" "}
              <ArrowUpRight size={14} style={{ display: "inline" }} />
            </Link>
          </div>
          <Enrichment compact />
        </section>
        <section className="section" style={{ paddingTop: 12 }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">03 — UNDER THE SURFACE</div>
              <h2>Clear boundaries. Connected systems.</h2>
              <p>Three runtimes, with a defined responsibility for each.</p>
            </div>
            <Link className="textlink" href="/docs">
              Architecture & decisions ↗
            </Link>
          </div>
          {architecture.map((a, i) => (
            <div className="arch-row" key={a.tag}>
              <span className="arch-num">0{i + 1}</span>
              <div>
                <div className="arch-tag">{a.tag.slice(5)}</div>
                <h3>{a.title}</h3>
              </div>
              <p>{a.body}</p>
              <div className="arch-meta">
                {a.meta}
                <br />
                <Link href={a.href}>{a.link} ↗</Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
