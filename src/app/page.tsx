
import { Activity, Terminal, ArrowRight, Zap, Database, Shield, LayoutDashboard, PlayCircle, FileSpreadsheet, CheckCircle2, Users, Wrench, Server } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] font-[family-name:var(--font-geist-sans)] selection:bg-blue-100 selection:text-blue-900">

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 overflow-hidden bg-white">
        {/* Dot Pattern Background - Refined */}
        <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-6xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-600 text-[11px] font-bold uppercase tracking-wider mb-8 shadow-sm hover:shadow transition-shadow cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Live Real-Time Integration
            </span>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              The <span className="text-blue-600 relative inline-block font-[850] tracking-tighter">
                Air Traffic Control
                {/* <svg className="absolute w-[105%] h-3 -bottom-2 -left-1 text-blue-100 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="12" fill="none" />
                </svg> */}
              </span> for your Supply Chain Data.
            </h1>

            <p className="mt-8 text-xl text-slate-500 max-w-2xl mx-auto mb-6 leading-relaxed font-medium">
              Nexus connects your ERP, CRM, and PLM systems in real-time.
              Visualize data flows, detect errors instantly, and maintain a single source of truth.
            </p>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-10">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span><strong className="text-slate-900">60%</strong> fewer BOM import errors</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span><strong className="text-slate-900">&lt;200ms</strong> integration latency</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span><strong className="text-slate-900">Real-time</strong> failure detection</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
              <Link href="/integration-hub" className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all duration-200">
                <LayoutDashboard className="w-5 h-5 mr-2" /> Open Dashboard
              </Link>
              <Link href="/developer/playground" className="inline-flex items-center justify-center px-8 py-3.5 border border-slate-200 text-base font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm hover:border-slate-300 transition-all duration-200 group">
                <span className="font-mono text-blue-600 mr-2 font-bold group-hover:translate-x-0.5 transition-transform">&gt;_</span> Open Simulator
              </Link>
            </div>
          </div>

          {/* Terminal Graphic - Light Mode */}
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200 text-left font-mono text-sm relative group mt-12">
            {/* Window Controls */}
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-center relative backdrop-blur-sm">
              <div className="flex gap-2 absolute left-4">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-red-400/30" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-yellow-400/30" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-green-400/30" />
              </div>
              <div className="text-xs text-slate-400 font-medium font-sans flex items-center gap-1.5 opacity-80">
                <Terminal className="w-3 h-3" />
                nexus-cli — v2.4.8
              </div>
            </div>

            {/* Terminal Content */}
            <div className="p-8 text-slate-600 space-y-4 leading-relaxed bg-white/80 backdrop-blur-xl">
              <div className="flex items-center group/line">
                <span className="text-emerald-500 mr-3 font-bold">➜</span>
                <span className="text-slate-800 font-semibold tracking-tight">nexus connect --source ERP --target PLM</span>
                <span className="ml-2 w-1.5 h-4 bg-slate-300 opacity-0 group-hover/line:opacity-100 animate-pulse block" />
              </div>

              <div className="space-y-2">
                <div className="text-slate-400 pl-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                  Initializing handshake...
                </div>
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-slate-400">&gt; Authenticating via OAuth2... </span>
                  <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">OK</span>
                </div>
                <div className="pl-6 pb-2">
                  <span className="text-slate-400">&gt; Establishing WebSocket connection to </span>
                  <span className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors">wss://api.nexus.os/v1/stream...</span>
                </div>
              </div>

              <div className="pl-6 border-l-2 border-blue-100 ml-1 py-2 space-y-3">
                <div className="flex items-start gap-3 text-[13px]">
                  <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-0.5">INFO</span>
                  <span className="text-slate-500">[14:02:23] Stream active. Listening for events.</span>
                </div>
                <div className="flex items-start gap-3 text-[13px]">
                  <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-0.5">INFO</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="text-slate-500">[14:02:24]</span>
                    <span className="text-amber-600 font-medium">Incoming Payload:</span>
                    <code className="text-slate-600 font-mono bg-slate-50 px-1.5 rounded border border-slate-100">{`{ id: "PO-9921", status: "PENDING" }`}</code>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-[13px]">
                  <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-0.5">SUCCESS</span>
                  <span className="text-slate-500">[14:02:25] Transformed payload mapped to Schema v2.</span>
                </div>
                <div className="flex items-start gap-3 text-[13px] bg-red-50/50 -mx-4 px-4 py-1.5 rounded-r border-l-2 border-red-400">
                  <span className="text-red-600 font-bold text-[10px] bg-white px-1.5 py-0.5 rounded border border-red-100 mt-0.5">WARN</span>
                  <span className="text-slate-800 font-medium">[14:02:26] Latency spike (124ms) on <span className="underline decoration-dotted decoration-slate-400">eu-west-1</span>.</span>
                </div>
              </div>
              <div className="flex pt-1 pb-1">
                <span className="text-emerald-500 mr-3 font-bold">➜</span>
                <span className="animate-pulse w-2.5 h-5 bg-slate-400 inline-block align-middle" />
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Platform Ecosystem */}
      <section className="bg-white py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-60" />
              <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Module 01</h3>
                    <div className="text-slate-500 text-sm">Data Ingestion</div>
                  </div>
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-3">Intelligent BOM Importer</h4>
                <p className="text-slate-500 mb-6 leading-relaxed">
                  The first mile. Drag & drop messy Excel files. AI maps your columns, validates part numbers, and flags errors before they pollute your ERP.
                </p>
                <Link href="/bom-importer" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 group">
                  Launch Importer <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">The Ecosystem</span>
              <h2 className="text-4xl font-extrabold text-slate-900 mt-2 mb-6">Complete Supply Chain Coverage.</h2>
              <p className="text-lg text-slate-500 mb-8 max-w-lg">
                From the moment a spreadsheet is uploaded to the final API call syncing inventory, Nexus monitors every step of the journey.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* How to Experience (Vertical Timeline) */}
      <section className="bg-[#FAFAFA] py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-extrabold text-slate-900">How It Works</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">
              Follow these steps to see the real-time architecture in action, from data ingestion to live dashboard updates.
            </p>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-8 bottom-8 w-[2px] bg-slate-200 hidden md:block" />

            {/* Step 1 */}
            <div className="relative flex flex-col md:flex-row gap-8 mb-20 group">
              <div className="md:w-14 flex-shrink-0 flex flex-col items-center relative z-10">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center shadow-sm group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  1
                </div>
              </div>
              <div className="flex-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-xl group-hover:border-blue-100 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                    <LayoutDashboard className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Open the Dashboard</h3>
                    <p className="text-slate-500 leading-relaxed mb-4">
                      Navigate to the <strong>Integration Hub</strong>. This is your "Control Tower" where you can see the health of all connections.
                    </p>
                    <Link href="/integration-hub" className="text-blue-600 font-bold text-sm hover:underline">
                      Go to Dashboard &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 - BOM Importer */}
            <div className="relative flex flex-col md:flex-row gap-8 mb-20 group">
              <div className="md:w-14 flex-shrink-0 flex flex-col items-center relative z-10">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center shadow-sm group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  2
                </div>
              </div>
              <div className="flex-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-xl group-hover:border-blue-100 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Import a BOM File</h3>
                    <p className="text-slate-500 leading-relaxed mb-4">
                      Open the <strong>BOM Importer</strong>. Download our sample CSV, upload it, and watch the AI map your columns and validate the data. When validation completes, it fires a real-time event to the Dashboard.
                    </p>
                    <Link href="/bom-importer" className="text-blue-600 font-bold text-sm hover:underline">
                      Open BOM Importer &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col md:flex-row gap-8 mb-20 group">
              <div className="md:w-14 flex-shrink-0 flex flex-col items-center relative z-10">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-pink-100 text-pink-600 font-bold text-xl flex items-center justify-center shadow-sm group-hover:border-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
                  3
                </div>
              </div>
              <div className="flex-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-xl group-hover:border-pink-100 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-pink-50 rounded-xl flex items-center justify-center shrink-0 text-pink-600 font-mono text-lg font-bold">
                    &gt;_
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Launch the Simulator</h3>
                    <p className="text-slate-500 leading-relaxed mb-4">
                      Open the <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">API Playground</code> in a new tab. This tool lets you pretend to be Shopify or Salesforce sending data.
                    </p>
                    <Link href="/developer/playground" className="text-pink-600 font-bold text-sm hover:underline">
                      Open Simulator &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative flex flex-col md:flex-row gap-8 group">
              <div className="md:w-14 flex-shrink-0 flex flex-col items-center relative z-10">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-emerald-100 text-emerald-600 font-bold text-xl flex items-center justify-center shadow-sm group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  4
                </div>
              </div>
              <div className="flex-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-xl group-hover:border-emerald-100 transition-all duration-300">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
                    <PlayCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Watch it React in Real-Time</h3>
                    <p className="text-slate-500 leading-relaxed mb-4">
                      Switch back to the Dashboard. Every BOM import and API call appears <strong>instantly</strong> in the live activity feed — no page refresh needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who Uses Nexus */}
      <section className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Who Uses Nexus</h2>
            <p className="text-slate-500 mt-4">Built for the teams that keep supply chains running.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-8 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-blue-600">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Supply Chain Ops</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Monitor every data handoff between systems. Catch failures before they cascade downstream.</p>
            </div>
            <div className="text-center p-8 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-pink-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-pink-600">
                <Wrench className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Integration Engineers</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Debug webhook payloads, trace events end-to-end, and validate schema mappings in real time.</p>
            </div>
            <div className="text-center p-8 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-emerald-600">
                <Server className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">ERP Administrators</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Import and validate BOM data before it enters the ERP. Reduce manual cleanup by catching errors upfront.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Scale */}
      <section className="bg-[#FAFAFA] py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Built for Scale & Reliability</h2>
            <p className="text-slate-500 mt-4">This isn't just a prototype. It's built with production-grade infrastructure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <TechCard
              icon={<Database className="w-6 h-6" />}
              title="Neon Database"
              description="Serverless PostgreSQL for persistent audit logs and scalable storage."
            />
            <TechCard
              icon={<Zap className="w-6 h-6" />}
              title="Pusher Real-Time"
              description="WebSockets for sub-millisecond UI updates and live data synchronization."
            />
            <TechCard
              icon={<Activity className="w-6 h-6" />}
              title="Next.js 16"
              description="React Server Components for optimal performance and SEO capabilities."
            />
            <TechCard
              icon={<Shield className="w-6 h-6" />}
              title="Type-Safe"
              description="End-to-end TypeScript validation ensuring data integrity across the stack."
            />
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <p>&copy; 2026 Nexus Integration. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/docs" className="hover:text-slate-900 transition-colors">Documentation</Link>
            <Link href="/api-reference" className="hover:text-slate-900 transition-colors">API Reference</Link>
            <Link href="/status" className="hover:text-slate-900 transition-colors">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TechCard({ icon, title, description }: any) {
  return (
    <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 mb-6">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-3">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}
