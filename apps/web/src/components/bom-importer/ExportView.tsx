
'use client';

import { motion } from 'framer-motion';
import { Download, CheckCircle, FileJson, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { ValidatedRow } from '@/lib/validator';
import * as XLSX from 'xlsx';

interface ExportViewProps {
    rows: ValidatedRow[];
    onReset: () => void;
}

export function ExportView({ rows, onReset }: ExportViewProps) {
    const validRows = rows.filter(r => r.status !== 'invalid').map(r => r.mapped);

    const downloadJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(validRows, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "clean_bom.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const downloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(validRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clean BOM");
        XLSX.writeFile(workbook, "clean_bom.xlsx");
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center py-12"
        >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-4">Import Successful!</h2>
            <p className="text-slate-500 mb-8">
                We successfully processed <strong>{rows.length} rows</strong>.
                <br />
                Your clean data is ready for export.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                <button
                    onClick={downloadJSON}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                        <FileJson className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900">Download JSON</p>
                        <p className="text-xs text-slate-500">For developers</p>
                    </div>
                </button>

                <button
                    onClick={downloadExcel}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                        <FileSpreadsheet className="w-6 h-6 text-slate-600 group-hover:text-green-600" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900">Download Excel</p>
                        <p className="text-xs text-slate-500">For business</p>
                    </div>
                </button>
            </div>

            <button
                onClick={onReset}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mx-auto font-medium"
            >
                <RefreshCw className="w-4 h-4" /> Import Another File
            </button>
        </motion.div>
    );
}
