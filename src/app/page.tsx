
import { Activity, Terminal, ArrowRight, Zap, Database, Shield, LayoutDashboard, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6 border border-indigo-100">
              <Zap className="w-4 h-4 fill-current" /> Live Real-Time Integration
            </span>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl mb-8">
              The <span className="text-indigo-600">Air Traffic Control</span> for your Supply Chain Data.
            </h1>
            <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto mb-10">
              Nexus connects your ERP, CRM, and PLM systems in real-time.
              Visualize data flows, detect errors instantly, and maintain a single source of truth.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/integration-hub" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25 transition-all">
                <LayoutDashboard className="w-5 h-5 mr-2" /> Open Dashboard
              </Link>
              <Link href="/developer/playground" className="inline-flex items-center justify-center px-8 py-4 border border-slate-200 text-lg font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all">
                <Terminal className="w-5 h-5 mr-2" /> Open Simulator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How to Demo Section */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How to Experience the Demo</h2>
            <p className="text-slate-500 mt-4">Follow these simple steps to see the real-time architecture in action.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-slate-900 select-none">1</div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6 text-indigo-600">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Open the Dashboard</h3>
              <p className="text-slate-500 mb-6">
                Navigate to the <strong>Integration Hub</strong>. This is your "Control Tower" where you can see the health of all connections.
              </p>
              <Link href="/integration-hub" className="text-indigo-600 font-bold flex items-center gap-1 hover:gap-2 transition-all">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-pink-200 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-slate-900 select-none">2</div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-6 text-pink-600">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Launch the Simulator</h3>
              <p className="text-slate-500 mb-6">
                Open the **API Playground** in a new tab. This tool lets you pretend to be Shopify or Salesforce sending data.
              </p>
              <Link href="/developer/playground" className="text-pink-600 font-bold flex items-center gap-1 hover:gap-2 transition-all">
                Open Simulator <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-slate-900 select-none">3</div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6 text-emerald-600">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Trigger Real-Time Event</h3>
              <p className="text-slate-500 mb-6">
                Click <strong>"Load Failure Example"</strong> and hit Send. Switch back to the Dashboard instantly to see it turn <span className="text-red-500 font-bold">RED</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="bg-white border-t border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Built for Scale & Reliability</h2>
            <p className="text-slate-500 mt-4">This isn't just a prototype. It's built with production-grade infrastructure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TechCard
              icon={<Database className="w-5 h-5" />}
              title="Neon Database"
              description="Serverless PostgreSQL for persistent audit logs."
            />
            <TechCard
              icon={<Zap className="w-5 h-5" />}
              title="Pusher Real-Time"
              description="WebSockets for sub-millisecond UI updates."
            />
            <TechCard
              icon={<Activity className="w-5 h-5" />}
              title="Next.js 16"
              description="React Server Components for optimal performance."
            />
            <TechCard
              icon={<Shield className="w-5 h-5" />}
              title="Type-Safe"
              description="End-to-end TypeScript validation."
            />
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2026 Nexus Integration. Built as a technical demonstration.</p>
        </div>
      </footer>
    </div>
  );
}

function TechCard({ icon, title, description }: any) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
      <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-900 mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  )
}
