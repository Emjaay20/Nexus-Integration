
'use client';

import { ArrowLeft, Clock, AlertCircle, CheckCircle, Copy } from 'lucide-react';

export default function IntegrationDetailsPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] p-8">
            <div className="max-w-5xl mx-auto">
                <a href="/integration-hub" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </a>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-sm font-bold border border-red-200">
                                    Failed
                                </span>
                                <span className="text-slate-400 text-sm">ID: ev_8f92j290</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Customer Sync: Salesforce to Slack</h1>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1 justify-end">
                                <Clock className="w-4 h-4" /> 12 mins ago
                            </div>
                            <div className="text-xs text-slate-400">Duration: 420ms</div>
                        </div>
                    </div>

                    {/* Error Section */}
                    <div className="bg-red-50 p-6 border-b border-red-100">
                        <div className="flex gap-4">
                            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-red-900 mb-1">Error: Invalid Webhook Signature</h3>
                                <p className="text-red-700 text-sm font-mono">
                                    [401] Unauthorized. The signature provided in 'X-Slack-Signature' does not match the expected value. code: AUTH_ERROR
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payload Viewer */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
                                Request Payload
                                <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-blue-600" />
                            </h3>
                            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                <pre className="text-xs text-blue-300 font-mono">
                                    {`{
  "event": "customer.created",
  "customer": {
    "id": "ct_99210",
    "email": "sarah.connor@example.com",
    "company": "Skynet Systems",
    "plan": "enterprise"
  },
  "metadata": {
    "source": "salesforce_crm",
    "timestamp": 12903332
  }
}`}
                                </pre>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4">Response Headers</h3>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 font-mono text-xs space-y-2">
                                <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
                                    <span className="text-slate-500">Status</span>
                                    <span className="col-span-2 text-slate-900">401 Unauthorized</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
                                    <span className="text-slate-500">Content-Type</span>
                                    <span className="col-span-2 text-slate-900">application/json</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <span className="text-slate-500">X-Request-ID</span>
                                    <span className="col-span-2 text-slate-900">req_9920112</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
