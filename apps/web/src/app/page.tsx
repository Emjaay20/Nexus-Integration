import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, Shield, Cpu, Activity, CheckCircle2, AlertTriangle, Layers, ExternalLink } from 'lucide-react';

export default function Home() {
  const sampleBomRows = [
    {
      line: 1,
      mpn: 'STM32F401RET6',
      mfr: 'STMicroelectronics',
      qty: 2,
      designators: 'U1, U2',
      status: 'Active',
      statusColor: 'text-emerald-400',
      note: 'Pin-compatible alternate GD32F405 qualified (-24% cost)',
    },
    {
      line: 2,
      mpn: 'LM1117-3.3',
      mfr: 'Texas Instruments',
      qty: 4,
      designators: 'U3, U4, U5, U6',
      status: 'Active',
      statusColor: 'text-emerald-400',
      note: 'Drop-in SOT-223 second source available (AZ1117)',
    },
    {
      line: 3,
      mpn: 'RC0603FR-0710KL',
      mfr: 'Yageo',
      qty: 48,
      designators: 'R1-R48',
      status: 'Active',
      statusColor: 'text-emerald-400',
      note: '10K 0603 1% standard passive tape-and-reel',
    },
    {
      line: 4,
      mpn: 'OPA2350-OBS',
      mfr: 'Legacy Semi',
      qty: 1,
      designators: 'U7',
      status: 'Obsolete',
      statusColor: 'text-rose-400',
      note: 'Lifecycle Alert: Manufacturer discontinued production',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-slate-800">
      {/* Top Industrial Header Banner */}
      <section className="border-b border-slate-800 bg-slate-900/60 py-16 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
              INDUSTRIAL INTEGRATION SUITE
            </span>
            <span className="text-xs font-mono text-slate-500">v0.1.0 • Rust service + Next.js app</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-4xl leading-tight">
            Electronics Supply Chain Integration & BOM Ingestion
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            Import and normalize customer Bills of Materials, evaluate multi-tenant access rules, and monitor synchronization events across ERP and e-commerce systems.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/bom-importer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload & Map BOM
            </Link>
            <Link
              href="/platform-core"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium transition"
            >
              <Cpu className="w-4 h-4 text-indigo-400" />
              Platform Core Studio (Rust)
            </Link>
            <Link
              href="/integration-hub"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-sm font-medium transition"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Activity Feed
            </Link>
          </div>
        </div>
      </section>

      {/* Sample BOM table */}
      <section className="max-w-6xl mx-auto px-6 py-12 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Sample BOM After Import
            </h2>
            <p className="text-xs text-slate-500">
              Example PCBA line items showing MPN normalization and lifecycle flags.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Example data
          </span>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-900/50">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold w-12">#</th>
                <th className="py-3 px-4 font-semibold">Normalized MPN</th>
                <th className="py-3 px-4 font-semibold">Manufacturer</th>
                <th className="py-3 px-4 font-semibold text-right">Qty</th>
                <th className="py-3 px-4 font-semibold">Designators</th>
                <th className="py-3 px-4 font-semibold">Lifecycle</th>
                <th className="py-3 px-4 font-semibold">Engineering Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {sampleBomRows.map((row) => (
                <tr key={row.line} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-slate-500">{row.line}</td>
                  <td className="py-3 px-4 font-semibold text-white">{row.mpn}</td>
                  <td className="py-3 px-4 text-slate-400">{row.mfr}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{row.qty}</td>
                  <td className="py-3 px-4 text-slate-400">{row.designators}</td>
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
                  <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Core Architectural Modules */}
      <section className="max-w-6xl mx-auto px-6 py-8 border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              BOM Parser
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Maps customer columns to a standard schema, normalizes vendor tape-and-reel suffixes, and validates quantities and reference designators.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-500">
              Tech: PapaParse in the browser, Rust parser in Platform Core
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Shield className="w-4 h-4 text-indigo-400" />
              ABAC Permissions Engine
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Evaluates access between OEMs, EMS providers, and component distributors against an in-memory policy set that can be hot-reloaded without blocking requests.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-500">
              Tech: Rust, ArcSwap policy snapshot
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              Real-Time Activity Feed
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Receives webhooks from connected systems such as Shopify and pushes them to each user over a private channel, with every event stored for audit.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-500">
              Tech: Private Pusher Channels & PostgreSQL Audit
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-8 px-6 text-xs font-mono text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>Nexus.OS • Designed for Electronics Manufacturing</div>
          <div className="flex items-center gap-4">
            <Link href="/status" className="hover:text-slate-300 transition">
              Live System Status
            </Link>
            <Link href="/docs" className="hover:text-slate-300 transition">
              Documentation
            </Link>
            <Link href="/platform-core" className="hover:text-slate-300 transition text-indigo-400">
              Rust Engine Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
