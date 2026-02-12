'use client';

import { Clock, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { JsonViewer } from './JsonViewer';
import { EventTimeline } from './EventTimeline';

interface IntegrationLog {
    id: string | number;
    integration: string;
    event: string;
    status: string;
    time: string;
    duration?: string;
    payload?: string;
    response?: any;
    error?: any;
}

interface LogDetailClientProps {
    log: IntegrationLog;
    relatedLogs: IntegrationLog[];
}

export function LogDetailClient({ log, relatedLogs }: LogDetailClientProps) {
    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
            </div>

            {/* Timeline + Payload Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline */}
                <div>
                    <EventTimeline
                        status={log.status}
                        time={log.time}
                        duration={log.duration}
                    />
                </div>

                {/* Payload / Response */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <JsonViewer data={log.payload} title="Request Payload" />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        {log.response ? (
                            <JsonViewer data={log.response} title="Response" />
                        ) : (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Response</h3>
                                <div className="text-sm text-slate-500 italic">No response data captured.</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Related Events */}
            {relatedLogs.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-slate-400" />
                            Related Events from {log.integration}
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {relatedLogs.map(related => (
                            <Link
                                key={related.id}
                                href={`/integration-hub/logs/${related.id}`}
                                className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${related.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className="text-sm font-medium text-slate-800">{related.event}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    {related.duration && <span>{related.duration}</span>}
                                    <span>{related.time}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
