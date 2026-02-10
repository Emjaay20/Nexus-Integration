import { ArrowLeft, Clock, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { integrationService } from '@/services/integrationService';
import Link from 'next/link';

export default async function IntegrationLogPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const log = await integrationService.getLogById(id);

    if (!log) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Log Not Found</h1>
                    <Link href="/integration-hub" className="text-indigo-600 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] p-8">
            <div className="max-w-5xl mx-auto">
                <Link href="/integration-hub" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-sm font-bold border ${log.status === 'success'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-red-100 text-red-700 border-red-200'
                                    }`}>
                                    {log.status === 'success' ? 'Success' : 'Failed'}
                                </span>
                                <span className="text-slate-400 text-sm">ID: log_{log.id}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">{log.event}: {log.integration}</h1>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1 justify-end">
                                <Clock className="w-4 h-4" /> {log.time}
                            </div>
                            {log.duration && (
                                <div className="text-xs text-slate-400">Duration: {log.duration}</div>
                            )}
                        </div>
                    </div>

                    {/* Error Section */}
                    {log.error && (
                        <div className="bg-red-50 p-6 border-b border-red-100">
                            <div className="flex gap-4">
                                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-red-900 mb-1">Error: {log.error.name}</h3>
                                    <p className="text-red-700 text-sm font-mono">
                                        {log.error.message} {log.error.code && `code: ${log.error.code}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payload Viewer */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
                                Request Payload
                                <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-blue-600" />
                            </h3>
                            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                <pre className="text-xs text-blue-300 font-mono">
                                    {log.payload || '// No payload available'}
                                </pre>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4">Response Headers</h3>
                            {log.response ? (
                                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 font-mono text-xs space-y-2">
                                    <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
                                        <span className="text-slate-500">Status</span>
                                        <span className="col-span-2 text-slate-900">{log.response.status} {log.response.statusText}</span>
                                    </div>
                                    {Object.entries(log.response.headers).map(([key, value]) => (
                                        <div key={key} className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                            <span className="text-slate-500">{key}</span>
                                            <span className="col-span-2 text-slate-900">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 italic">No response data captured.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
