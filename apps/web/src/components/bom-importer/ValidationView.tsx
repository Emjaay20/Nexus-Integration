
'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Download, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { ValidatedRow } from '@/lib/validator';

interface ValidationViewProps {
    rows: ValidatedRow[];
    onContinue: () => void;
    onBack: () => void;
}

export function ValidationView({ rows, onContinue, onBack }: ValidationViewProps) {
    const validCount = rows.filter(r => r.status === 'valid').length;
    const invalidCount = rows.filter(r => r.status === 'invalid').length;
    const warningCount = rows.filter(r => r.status === 'warning').length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl mx-auto"
        >
            <div className="flex gap-4 mb-8">
                <SummaryCard
                    icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                    title="Valid Rows"
                    count={validCount}
                    color="bg-green-50 border-green-200"
                />
                <SummaryCard
                    icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
                    title="Warnings"
                    count={warningCount}
                    color="bg-amber-50 border-amber-200"
                />
                <SummaryCard
                    icon={<XCircle className="w-6 h-6 text-red-600" />}
                    title="Critical Errors"
                    count={invalidCount}
                    color="bg-red-50 border-red-200"
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Processing Data</h3>
                    <span className="text-sm text-slate-500">{rows.length} total rows</span>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Part Number</th>
                                <th className="px-6 py-3">Quantity</th>
                                <th className="px-6 py-3">Messages</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <StatusBadge status={row.status} />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {row.mapped.partNumber || <span className="text-slate-300 italic">Missing</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {row.mapped.quantity || <span className="text-slate-300 italic">Missing</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {row.messages.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {row.messages.map((msg, i) => (
                                                    <span key={i} className={clsx(
                                                        "text-xs px-2 py-0.5 rounded-full w-fit",
                                                        row.status === 'invalid' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {msg}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-green-600 text-xs">Ready</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <button
                    onClick={onBack}
                    className="text-slate-500 hover:text-slate-800 px-4 py-2 font-medium"
                >
                    Back to Mapping
                </button>

                <button
                    onClick={onContinue}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                    Proceed to Export <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

function SummaryCard({ icon, title, count, color }: { icon: React.ReactNode, title: string, count: number, color: string }) {
    return (
        <div className={clsx("flex-1 p-6 rounded-xl border flex items-center gap-4", color)}>
            <div className="bg-white p-3 rounded-full shadow-sm">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-slate-800">{count}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'valid') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Valid</span>;
    if (status === 'warning') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Warning</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Invalid</span>;
}
