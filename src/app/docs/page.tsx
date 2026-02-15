import Link from 'next/link';
import { BookOpen, Zap, Upload, BarChart3, Settings, ArrowLeft, ExternalLink } from 'lucide-react';

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-[family-name:var(--font-geist-sans)]">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-900">Nexus.OS</span>
                        </div>
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                        Sign In →
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16">
                {/* Title */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Documentation</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                        Getting Started with Nexus
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl">
                        Everything you need to integrate, monitor, and optimize your supply chain data pipeline.
                    </p>
                </div>

                {/* Quick Start */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Start</h2>
                    <div className="bg-slate-900 rounded-2xl p-6 text-sm font-mono text-slate-300 overflow-x-auto">
                        <div className="text-slate-500 mb-2"># Clone and run locally</div>
                        <div><span className="text-emerald-400">$</span> git clone https://github.com/Emjaay20/Nexus-Integration.git</div>
                        <div><span className="text-emerald-400">$</span> cd Nexus-Integration</div>
                        <div><span className="text-emerald-400">$</span> npm install</div>
                        <div><span className="text-emerald-400">$</span> cp .env.example .env.local</div>
                        <div><span className="text-emerald-400">$</span> npm run dev</div>
                        <div className="mt-3 text-slate-500"># Open http://localhost:3000</div>
                    </div>
                </section>

                {/* Core Features */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8">Core Features</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FeatureDoc
                            icon={<Zap className="w-5 h-5" />}
                            title="Integration Hub"
                            description="Connect SAP, Oracle, Salesforce, and custom APIs. Monitor health, sync status, and data throughput in real time."
                            items={[
                                'Pre-built connectors for major ERPs',
                                'Real-time activity feed with Pusher',
                                'Automatic health monitoring & alerts',
                                'Per-user data isolation (multi-tenant)',
                            ]}
                        />
                        <FeatureDoc
                            icon={<Upload className="w-5 h-5" />}
                            title="BOM Importer"
                            description="Upload CSV/Excel files, map columns intelligently, and validate data against your schema before import."
                            items={[
                                'Drag-and-drop file upload',
                                'Smart column auto-mapping',
                                'Row-level validation with error details',
                                'Export cleaned data as JSON',
                            ]}
                        />
                        <FeatureDoc
                            icon={<BarChart3 className="w-5 h-5" />}
                            title="Analytics Dashboard"
                            description="Track sync volume, error rates, latency, and integration health with interactive charts."
                            items={[
                                'Activity trends (7-day view)',
                                'Status breakdown (pie charts)',
                                'Per-integration success rates',
                                'Performance metrics over time',
                            ]}
                        />
                        <FeatureDoc
                            icon={<Settings className="w-5 h-5" />}
                            title="Settings & Data Management"
                            description="Manage API keys, notifications, and data retention. Reset or clear your data at any time."
                            items={[
                                'API key management',
                                'Email & Slack alert toggles',
                                'Data retention policies',
                                'One-click demo data reset',
                            ]}
                        />
                    </div>
                </section>

                {/* Architecture */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Architecture</h2>
                    <div className="bg-white border border-slate-200 rounded-2xl p-8">
                        <div className="grid md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3">Frontend</h3>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li>• Next.js 16 (App Router)</li>
                                    <li>• React Server Components</li>
                                    <li>• Tailwind CSS</li>
                                    <li>• Framer Motion</li>
                                    <li>• Recharts</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3">Backend</h3>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li>• Next.js API Routes</li>
                                    <li>• NextAuth.js v5</li>
                                    <li>• Server Actions</li>
                                    <li>• Pusher (real-time)</li>
                                    <li>• Resend (email)</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3">Database</h3>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li>• PostgreSQL (Neon)</li>
                                    <li>• Multi-tenant schema</li>
                                    <li>• UUID primary keys</li>
                                    <li>• Cascade deletes</li>
                                    <li>• Indexed user queries</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Auth */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Authentication</h2>
                    <p className="text-slate-600 mb-6">
                        Nexus supports three authentication methods, all powered by NextAuth.js v5:
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-5">
                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-white text-xs font-bold">GH</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">GitHub OAuth</h3>
                                <p className="text-sm text-slate-500">Sign in with your GitHub account. Requires OAuth app credentials.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-5">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-white text-xs font-bold">✉</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Magic Link <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Recommended</span></h3>
                                <p className="text-sm text-slate-500">Passwordless email login via Resend. Click a link, you're in.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-5">
                            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-white text-xs font-bold">⚡</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Demo Account</h3>
                                <p className="text-sm text-slate-500">One-click login with pre-seeded demo data. Credentials: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">demo@nexus.dev / demo1234</code></p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Connecting External Systems */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Connecting External Systems</h2>
                    <p className="text-slate-600 mb-8">
                        Send webhook events from any system to your Nexus dashboard using the webhook API.
                        All you need is your API key.
                    </p>

                    {/* Step 1: Get your API key */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            Get your API key
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Sign in, navigate to <strong>Integration Hub → Settings</strong>, and copy your API key.
                            It looks like <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">sk_live_abc123...</code>.
                            You can rotate it at any time — the old key is immediately invalidated.
                        </p>
                    </div>

                    {/* Step 2: Send a webhook */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            Send a webhook event
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Make a <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">POST</code> request
                            to <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">/api/integrations/webhook/trigger</code> with
                            your API key in the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">Authorization</code> header.
                        </p>

                        {/* Endpoint reference */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">POST</span>
                                <code className="text-sm font-mono text-slate-700">/api/integrations/webhook/trigger</code>
                            </div>
                            <div className="text-sm text-slate-600 mb-4">
                                <strong className="text-slate-900">Headers</strong>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-600 mb-4">
                                <div>Content-Type: application/json</div>
                                <div>Authorization: Bearer <span className="text-blue-600">YOUR_API_KEY</span></div>
                            </div>
                            <div className="text-sm text-slate-600 mb-3">
                                <strong className="text-slate-900">Request Body</strong>
                            </div>
                            <table className="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Field</th>
                                        <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Type</th>
                                        <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Required</th>
                                        <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    <tr>
                                        <td className="py-2 px-3 font-mono text-blue-700">event</td>
                                        <td className="py-2 px-3 text-slate-500">string</td>
                                        <td className="py-2 px-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Yes</span></td>
                                        <td className="py-2 px-3 text-slate-600">Event name, e.g. &quot;order.created&quot;</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 font-mono text-blue-700">source</td>
                                        <td className="py-2 px-3 text-slate-500">string</td>
                                        <td className="py-2 px-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Yes</span></td>
                                        <td className="py-2 px-3 text-slate-600">System identifier: shopify, salesforce, arena, or custom</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 font-mono text-blue-700">payload</td>
                                        <td className="py-2 px-3 text-slate-500">object</td>
                                        <td className="py-2 px-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Optional</span></td>
                                        <td className="py-2 px-3 text-slate-600">Arbitrary JSON payload data</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 font-mono text-blue-700">status</td>
                                        <td className="py-2 px-3 text-slate-500">string</td>
                                        <td className="py-2 px-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Optional</span></td>
                                        <td className="py-2 px-3 text-slate-600">Set to &quot;failure&quot; to trigger the retry lifecycle</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Step 3: Example requests */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            Example requests
                        </h3>

                        {/* curl */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">curl</span>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 text-sm font-mono text-slate-300 overflow-x-auto">
                                <div><span className="text-emerald-400">$</span> curl -X POST https://your-domain.com/api/integrations/webhook/trigger \</div>
                                <div className="pl-4">-H &quot;Content-Type: application/json&quot; \</div>
                                <div className="pl-4">-H &quot;Authorization: Bearer <span className="text-blue-400">sk_live_your_key_here</span>&quot; \</div>
                                <div className="pl-4">{`-d '{"event": "order.created", "source": "shopify", "payload": {"order_id": "ORD-9281", "total": 249.99}}'`}</div>
                            </div>
                        </div>

                        {/* JavaScript */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">JavaScript (fetch)</span>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre">{`const res = await fetch("/api/integrations/webhook/trigger", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_live_your_key_here"
  },
  body: JSON.stringify({
    event: "inventory.update",
    source: "shopify",
    payload: { sku: "NEXUS-001", qty: 450 }
  })
});

const data = await res.json();
console.log(data);`}</div>
                        </div>

                        {/* Python */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Python (requests)</span>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-5 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre">{`import requests

res = requests.post(
    "https://your-domain.com/api/integrations/webhook/trigger",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_live_your_key_here"
    },
    json={
        "event": "lead.converted",
        "source": "salesforce",
        "payload": {"lead_id": "00Q1234", "account": "Acme Corp"}
    }
)

print(res.json())`}</div>
                        </div>
                    </div>

                    {/* Failure Recovery */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                            Failure recovery lifecycle
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            When you send an event with <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{`"status": "failure"`}</code>,
                            Nexus automatically handles retry and recovery:
                        </p>
                        <div className="flex items-center gap-3 text-sm mb-4 flex-wrap">
                            <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-red-200">Failed</span>
                            <span className="text-slate-400">→ 1.5s →</span>
                            <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-amber-200">Retrying</span>
                            <span className="text-slate-400">→ 1.5s →</span>
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-emerald-200">Recovered</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Each transition is broadcast in real time via WebSocket and appears instantly in your dashboard activity feed.
                            The integration status updates from <strong className="text-slate-700">error</strong> → <strong className="text-slate-700">healthy</strong> once recovered.
                        </p>
                    </div>

                    {/* Supported Sources */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                            Supported sources
                        </h3>
                        <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Source</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Maps To</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Example Events</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    ['shopify', 'ecommerce-sync', 'order.created, inventory.update'],
                                    ['salesforce', 'crm-updates', 'lead.converted, contact.updated'],
                                    ['arena', 'plm-erp', 'bom.revision, part.released'],
                                    ['bom-importer', 'bom-importer', 'bom.import.completed'],
                                    ['(any string)', '(uses value as-is)', 'Any custom event name'],
                                ].map(([source, maps, events]) => (
                                    <tr key={source}>
                                        <td className="py-3 px-4 font-mono text-xs text-blue-700 bg-blue-50/30">{source}</td>
                                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{maps}</td>
                                        <td className="py-3 px-4 text-slate-600">{events}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Environment Variables */}
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Environment Variables</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Variable</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Required</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    ['DATABASE_URL', 'Yes', 'Neon PostgreSQL connection string'],
                                    ['AUTH_SECRET', 'Yes', 'NextAuth.js session encryption key'],
                                    ['PUSHER_APP_ID', 'Yes', 'Pusher app ID for real-time events'],
                                    ['NEXT_PUBLIC_PUSHER_KEY', 'Yes', 'Pusher public key (client-side)'],
                                    ['PUSHER_SECRET', 'Yes', 'Pusher secret key (server-side)'],
                                    ['NEXT_PUBLIC_PUSHER_CLUSTER', 'Yes', 'Pusher cluster region'],
                                    ['GITHUB_CLIENT_ID', 'Optional', 'GitHub OAuth app client ID'],
                                    ['GITHUB_CLIENT_SECRET', 'Optional', 'GitHub OAuth app client secret'],
                                    ['RESEND_API_KEY', 'Optional', 'Resend API key for magic link emails'],
                                ].map(([name, required, desc]) => (
                                    <tr key={name}>
                                        <td className="py-3 px-4 font-mono text-xs text-blue-700 bg-blue-50/30">{name}</td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${required === 'Yes' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {required}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 py-8">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
                    <p>&copy; 2026 Nexus Integration</p>
                    <div className="flex gap-6">
                        <Link href="/docs" className="text-blue-600 font-medium">Documentation</Link>
                        <Link href="/api-reference" className="hover:text-slate-600 transition-colors">API Reference</Link>
                        <Link href="/status" className="hover:text-slate-600 transition-colors">Status</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureDoc({ icon, title, description, items }: any) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    {icon}
                </div>
                <h3 className="font-bold text-slate-900">{title}</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">{description}</p>
            <ul className="space-y-1.5">
                {items.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
