import Link from 'next/link';
import { ArrowLeft, Copy, Send, ChevronRight } from 'lucide-react';

export default function ApiReferencePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-[family-name:var(--font-geist-sans)]">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-900">Nexus.OS</span>
                        </div>
                    </Link>
                    <Link href="/developer/playground" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" />
                        Try Playground →
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16">
                {/* Title */}
                <div className="mb-16">
                    <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 block">API Reference</span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                        REST API
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl">
                        Nexus exposes a RESTful API for triggering webhook events, managing BOM imports, and controlling user data.
                    </p>
                    <div className="mt-6 bg-slate-100 rounded-xl px-4 py-3 inline-flex items-center gap-3 text-sm">
                        <span className="text-slate-500">Base URL:</span>
                        <code className="font-mono text-slate-900 font-medium">https://nexus-integration.vercel.app/api</code>
                    </div>
                </div>

                {/* Endpoints */}
                <div className="space-y-10">
                    <Endpoint
                        method="POST"
                        path="/api/integrations/webhook/trigger"
                        description="Trigger a webhook event for a specific integration. Creates an activity log entry and broadcasts a real-time event via Pusher."
                        auth={true}
                        body={`{
  "integrationId": "sap-erp",
  "event": "inventory.sync.completed",
  "payload": {
    "records_processed": 1247,
    "sync_type": "incremental"
  }
}`}
                        response={`{
  "success": true,
  "log": {
    "id": 42,
    "integration_id": "sap-erp",
    "event": "inventory.sync.completed",
    "status": "success",
    "duration": "245ms",
    "created_at": "2026-02-13T09:30:00Z"
  }
}`}
                    />

                    <Endpoint
                        method="POST"
                        path="/api/bom"
                        description="Upload and persist a validated BOM import. Stores the file metadata and parsed row data for later retrieval."
                        auth={true}
                        body={`{
  "filename": "components_q1.csv",
  "totalRows": 150,
  "validRows": 142,
  "invalidRows": 5,
  "warningRows": 3,
  "data": [...]
}`}
                        response={`{
  "success": true,
  "import": {
    "id": 7,
    "filename": "components_q1.csv",
    "total_rows": 150,
    "created_at": "2026-02-13T10:00:00Z"
  }
}`}
                    />

                    <Endpoint
                        method="GET"
                        path="/api/bom"
                        description="Retrieve all BOM imports for the authenticated user, ordered by most recent."
                        auth={true}
                        response={`{
  "imports": [
    {
      "id": 7,
      "filename": "components_q1.csv",
      "total_rows": 150,
      "valid_rows": 142,
      "created_at": "2026-02-13T10:00:00Z"
    }
  ]
}`}
                    />

                    <Endpoint
                        method="POST"
                        path="/api/user/reset"
                        description="Reset all user data and re-seed with demo data. Useful for returning to a known state."
                        auth={true}
                        response={`{
  "success": true,
  "message": "Data reset and demo data re-seeded"
}`}
                    />

                    <Endpoint
                        method="POST"
                        path="/api/user/clear"
                        description="Clear all user data without re-seeding. Leaves the dashboard in a clean, empty state."
                        auth={true}
                        response={`{
  "success": true,
  "message": "All data cleared"
}`}
                    />

                    <Endpoint
                        method="POST"
                        path="/api/auth/magic-link"
                        description="Send a passwordless login link to the specified email address. Link expires in 10 minutes."
                        auth={false}
                        body={`{
  "email": "user@company.com"
}`}
                        response={`{
  "success": true,
  "message": "Magic link sent"
}`}
                    />
                </div>

                {/* Auth Section */}
                <section className="mt-16 bg-amber-50 border border-amber-200 rounded-2xl p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Authentication</h2>
                    <p className="text-sm text-slate-600 mb-4">
                        Most endpoints require authentication via a NextAuth.js session cookie. When making requests from the browser,
                        the session cookie is automatically included. For programmatic access, use the API Playground.
                    </p>
                    <div className="bg-white rounded-xl p-4 text-sm font-mono text-slate-700">
                        Cookie: authjs.session-token=eyJhbGciOi...
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 py-8 mt-16">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
                    <p>&copy; 2026 Nexus Integration</p>
                    <div className="flex gap-6">
                        <Link href="/docs" className="hover:text-slate-600 transition-colors">Documentation</Link>
                        <Link href="/api-reference" className="text-indigo-600 font-medium">API Reference</Link>
                        <Link href="/status" className="hover:text-slate-600 transition-colors">Status</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function Endpoint({ method, path, description, auth, body, response }: any) {
    const methodColor = method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${methodColor}`}>{method}</span>
                    <code className="text-sm font-mono text-slate-800 font-medium">{path}</code>
                    {auth && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">AUTH REQUIRED</span>}
                </div>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {body && (
                    <div className="p-5">
                        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">Request Body</p>
                        <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded-xl p-4 overflow-x-auto">{body}</pre>
                    </div>
                )}
                <div className={`p-5 ${!body ? 'md:col-span-2' : ''}`}>
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">Response</p>
                    <pre className="text-xs font-mono text-emerald-700 bg-emerald-50 rounded-xl p-4 overflow-x-auto">{response}</pre>
                </div>
            </div>
        </div>
    );
}
