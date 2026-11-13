import Link from 'next/link';
import {
  ArrowRight,
  FileSpreadsheet,
  Shield,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BookOpen,
  Terminal,
  Sparkles,
  Lock,
  Database,
  GitBranch,
} from 'lucide-react';

export default function Home() {
  const sampleBomRows = [
    {
      line: 1,
      mpn: 'STM32F401RET6',
      mfr: 'STMicroelectronics',
      qty: 2,
      designators: 'U1, U2',
      distributors: 'DigiKey (8.4k) • Mouser (5.1k) • Farnell (1.9k)',
      bestPrice: '$3.68 @ 1k',
      mlRisk: '0.18 (Low)',
      status: 'Active',
      statusColor: 'text-emerald-400',
      note: 'Pin-compatible GD32F405RGT6 cosine sim 0.94 (-35% cost)',
    },
    {
      line: 2,
      mpn: 'LM1117-3.3',
      mfr: 'Texas Instruments',
      qty: 4,
      designators: 'U3, U4, U5, U6',
      distributors: 'DigiKey (42.1k) • Mouser (38.9k)',
      bestPrice: '$0.33 @ 1k',
      mlRisk: '0.07 (Low)',
      status: 'Active',
      statusColor: 'text-emerald-400',
      note: 'Drop-in SOT-223 second source AZ1117EH-3.3 qualified',
    },
    {
      line: 3,
      mpn: 'RC0603FR-0710KL',
      mfr: 'Yageo',
      qty: 48,
      designators: 'R1-R48',
      distributors: 'DigiKey (1.85M) • Mouser (2.40M)',
      bestPrice: '$0.0018 @ 5k',
      mlRisk: '0.04 (Low)',
      status: 'Active',
      statusColor: 'text-emerald-400',
      note: '10kΩ 0603 ±1% thick film — tape & reel consolidated',
    },
    {
      line: 4,
      mpn: 'OPA2350UA',
      mfr: 'Texas Instruments',
      qty: 1,
      designators: 'U7',
      distributors: 'DigiKey (310 left, 28w lead)',
      bestPrice: '$3.60 @ 100',
      mlRisk: '0.89 (Critical)',
      status: 'NRND',
      statusColor: 'text-rose-400',
      note: 'ML Stock-Out Alert (89% prob): qualify OPA2353UA (18.4k in stock)',
    },
  ];

  const architecturePillars = [
    {
      badge: 'RUST MONOLITH (ACTIX-WEB)',
      title: 'Sub-Microsecond ABAC Policy Decision Point & ML Inference',
      desc: 'Lock-free in-memory policy evaluation via ArcSwap (< 2 µs latency), streaming PCBA BOM normalization, calibrated GBDT log-odds stock-out model, and 32-D parametric cosine vector search.',
      tech: 'crates/platform-core • Actix-Web 4.9 • ArcSwap • Prometheus',
      href: '/platform-core',
    },
    {
      badge: 'GO CONCURRENT INGESTION DAEMON',
      title: 'Bounded Worker-Pool Distributor Fan-Out Service',
      desc: 'Dedicated Go service isolating noisy external distributor APIs (DigiKey v4 OAuth2, Mouser Search v1, verified multi-distributor catalog) behind bounded goroutine worker channels.',
      tech: 'services/ingest • Go 1.22 • Worker Pools • Price-Break Solver',
      href: '/platform-core',
    },
    {
      badge: 'DEVELOPER EXPERIENCE & AI AGENTS',
      title: 'Agent Bridge, SQL Multi-Tenant Linter & Policy Simulator',
      desc: 'Built-in static analyzer that blocks SQL queries missing tenant_id predicates or unbounded SELECTs, plus an interactive policy rule security scorer for human engineers and coding agents.',
      tech: 'crates/platform-cli • MCP Bridge • Multi-Tenant Guardrails',
      href: '/docs',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600/30">
      {/* Hero Section */}
      <section className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-16 lg:py-20 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
              POLYGLOT SUPPLY CHAIN PLATFORM
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400">
              Rust (actix-web) + Go (worker pool) + Next.js 16 + PostgreSQL
            </span>
          </div>

          <div className="space-y-4 max-w-4xl">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Software-Defined Electronics Supply Chain &amp; PCBA Quoting Engine
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
              Ingest messy customer Bills of Materials, enrich every MPN concurrently across global distributors in Go, score stock-out risk with in-process Rust ML inference, and enforce zero-trust multi-tenant ABAC permissions between OEMs and EMS providers.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              href="/platform-core"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-600/25"
            >
              <Cpu className="w-4 h-4" />
              Open Platform Core Studio (Rust + Go + ML)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/bom-importer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              Upload &amp; Validate BOM
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Architecture, ADRs &amp; Trade-Offs
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              Multi-Tenant Sign In / Register
            </Link>
          </div>

          {/* Live Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-[11px] font-mono uppercase text-slate-400">Rust ABAC Evaluation</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">&lt; 1.8 µs</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Lock-free ArcSwap PDP</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-[11px] font-mono uppercase text-slate-400">Go Distributor Fan-Out</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">8 Workers</div>
              <div className="text-[11px] text-blue-400 mt-0.5">DigiKey • Mouser • Catalog</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-[11px] font-mono uppercase text-slate-400">In-Process Rust ML</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">32-D Vector</div>
              <div className="text-[11px] text-indigo-400 mt-0.5">GBDT Risk + Cosine Search</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5">
              <div className="text-[11px] font-mono uppercase text-slate-400">Tenant Isolation</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">Zero-Trust</div>
              <div className="text-[11px] text-amber-400 mt-0.5">ABAC + SQL Query Linter</div>
            </div>
          </div>
        </div>
      </section>

      {/* Polyglot Architecture Overview */}
      <section className="max-w-6xl mx-auto px-6 py-14 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
              System Topology
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">
              Why Rust, Go, and TypeScript Each Own a Distinct Boundary
            </h2>
          </div>
          <Link
            href="/docs"
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Read full ADRs &amp; trade-off analysis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {architecturePillars.map((p, i) => (
            <div
              key={i}
              className="border border-slate-800 bg-slate-900/70 hover:border-slate-700 rounded-xl p-6 flex flex-col justify-between space-y-4 transition"
            >
              <div className="space-y-3">
                <span className="inline-block text-[10px] font-mono font-semibold px-2.5 py-1 rounded bg-slate-800 text-blue-300 border border-slate-700">
                  {p.badge}
                </span>
                <h3 className="text-base font-bold text-white leading-snug">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{p.tech}</span>
                <Link href={p.href} className="text-blue-400 hover:underline">
                  Explore →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enriched BOM Preview Table */}
      <section className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Multi-Distributor BOM Enrichment + Rust ML Stock-Out Scoring
            </h2>
            <p className="text-xs text-slate-400">
              Live output from the Rust <code className="text-indigo-300">/api/v1/bom/enrich</code> bridge calling the Go ingestion worker pool and in-process GBDT risk scorer.
            </p>
          </div>
          <Link
            href="/platform-core"
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Run interactive batch in Studio →
          </Link>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900/50">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">#</th>
                <th className="py-3 px-4 font-semibold">Normalized MPN</th>
                <th className="py-3 px-4 font-semibold">Distributor Stock (Go Fan-Out)</th>
                <th className="py-3 px-4 font-semibold">Best Tier Price</th>
                <th className="py-3 px-4 font-semibold">ML Stock-Out Prob</th>
                <th className="py-3 px-4 font-semibold">Lifecycle</th>
                <th className="py-3 px-4 font-semibold">Second-Source / Engineering Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {sampleBomRows.map((row) => (
                <tr key={row.line} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-slate-500">{row.line}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{row.mpn}</div>
                    <div className="text-[10px] text-slate-500">{row.mfr} • Qty {row.qty}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px]">{row.distributors}</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">{row.bestPrice}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        row.mlRisk.includes('Critical')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {row.mlRisk}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${row.statusColor}`}>
                      {row.status === 'Active' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px] font-sans">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-8 px-6 text-xs font-mono text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>Nexus.OS • Polyglot Electronics Supply Chain Platform (Rust + Go + Next.js)</div>
          <div className="flex items-center gap-5">
            <Link href="/platform-core" className="hover:text-slate-300 transition text-blue-400">
              Platform Core Studio
            </Link>
            <Link href="/docs" className="hover:text-slate-300 transition">
              Architecture &amp; ADRs
            </Link>
            <Link href="/status" className="hover:text-slate-300 transition">
              System Status
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
