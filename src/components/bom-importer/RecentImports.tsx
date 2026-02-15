'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface BomImport {
    id: number;
    filename: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    warning_rows: number;
    created_at: string;
}

export function RecentImports() {
    const [imports, setImports] = useState<BomImport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/bom')
            .then(res => res.json())
            .then(data => {
                setImports(data.imports || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-10 bg-slate-100 rounded" />
                    <div className="h-10 bg-slate-100 rounded" />
                </div>
            </div>
        );
    }

    if (imports.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No imports yet. Upload a BOM file to get started.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Recent Imports
                </h3>
            </div>
            <div className="divide-y divide-slate-100">
                {imports.map(imp => (
                    <div key={imp.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-800">{imp.filename}</p>
                                <p className="text-xs text-slate-500">
                                    {new Date(imp.created_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {imp.valid_rows}
                            </span>
                            {imp.warning_rows > 0 && (
                                <span className="flex items-center gap-1 text-amber-600">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {imp.warning_rows}
                                </span>
                            )}
                            {imp.invalid_rows > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                    <XCircle className="w-3.5 h-3.5" />
                                    {imp.invalid_rows}
                                </span>
                            )}
                            <span className="text-slate-400">
                                {imp.total_rows} rows
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
