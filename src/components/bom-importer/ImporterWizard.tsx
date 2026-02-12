
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload } from './FileUpload';
import { ColumnMapper, ColumnMapping } from './ColumnMapper';
import { ValidationView } from './ValidationView';
import { ExportView } from './ExportView';
import { validateData, ValidatedRow } from '@/lib/validator';
import { FileSpreadsheet, ArrowRight } from 'lucide-react';

/* 
  Steps:
  1. Upload (File selection)
  2. Mapping (Map columns)
  3. Processing (Validation)
  4. Results (Summary/Export)
*/

export function ImporterWizard() {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [file, setFile] = useState<File | null>(null);

    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping | null>(null);
    const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const handleMappingConfirm = async (newMapping: ColumnMapping) => {
        setMapping(newMapping);
        setIsValidating(true);

        const results = await validateData(parsedData, newMapping);
        setValidatedRows(results);
        setIsValidating(false);
        setStep(3);

        // Fire real-time event to Integration Hub
        const validCount = results.filter(r => r.status === 'valid').length;
        const errorCount = results.filter(r => r.status === 'invalid').length;
        try {
            await fetch('/api/integrations/webhook/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'bom.validated',
                    source: 'bom-importer',
                    payload: {
                        fileName: file?.name,
                        totalRows: results.length,
                        validRows: validCount,
                        errorRows: errorCount,
                        status: errorCount > 0 ? 'partial' : 'clean'
                    }
                })
            });
        } catch (err) {
            console.error('Failed to notify Integration Hub:', err);
        }
    };

    const handleFileSelect = async (uploadedFile: File) => {
        setFile(uploadedFile);
        setIsParsing(true);
        setStep(2); // Move to processing step immediately to show loading UI

        try {
            // dynamic import to avoid SSR issues with some libraries if needed, though standard import is fine here
            const { parseFile } = await import('@/lib/file-parser');
            const result = await parseFile(uploadedFile);

            setParsedData(result.data);
            setHeaders(result.headers);

            // Artificial delay for better UX
            setTimeout(() => {
                setIsParsing(false);
            }, 800);

        } catch (error) {
            console.error("Parsing failed", error);
            setIsParsing(false);
            // Handle error state (TODO)
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-6">
            {/* Progress Indicators (Simple for now) */}
            <div className="flex items-center justify-between mb-12 px-4 max-w-2xl mx-auto">
                <StepIndicator number={1} label="Upload" active={step >= 1} current={step === 1} />
                <Connector active={step >= 2} />
                <StepIndicator number={2} label="Map Columns" active={step >= 2} current={step === 2} />
                <Connector active={step >= 3} />
                <StepIndicator number={3} label="Validate" active={step >= 3} current={step === 3} />
                <Connector active={step >= 4} />
                <StepIndicator number={4} label="Export" active={step >= 4} current={step === 4} />
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col items-center justify-center min-h-[400px]"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Import your Bill of Materials</h2>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Upload your raw BOM file (CSV or Excel) and we'll help you clean, validate, and standardize it.
                            </p>
                        </div>
                        <FileUpload onFileSelect={handleFileSelect} />

                        {/* Quick Template Download */}
                        <div className="mt-12 flex gap-4 text-sm text-slate-400">
                            <a
                                href="/sample-bom.csv"
                                download
                                className="flex items-center gap-1 hover:text-blue-600 cursor-pointer transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Download Sample CSV
                            </a>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <ColumnMapper
                        headers={headers}
                        data={parsedData}
                        onConfirm={handleMappingConfirm}
                        onBack={() => {
                            setStep(1);
                            setFile(null);
                        }}
                    />
                )}

                {step === 3 && (
                    <ValidationView
                        rows={validatedRows}
                        onContinue={() => setStep(4)}
                        onBack={() => setStep(2)}
                    />
                )}

                {step === 4 && (
                    <ExportView
                        rows={validatedRows}
                        onReset={() => {
                            setStep(1);
                            setFile(null);
                            setParsedData([]);
                            setMapping(null);
                            setValidatedRows([]);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function StepIndicator({ number, label, active, current }: { number: number, label: string, active: boolean, current: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2 relative z-10">
            <div
                className={`
          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
          ${current ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}
        `}
            >
                {active && !current ? (
                    // Checkmark logic could go here, keeping it simple
                    number
                ) : number}
            </div>
            <span className={`text-xs font-medium absolute -bottom-6 w-24 text-center transition-colors ${active || current ? 'text-slate-700' : 'text-slate-400'}`}>
                {label}
            </span>
        </div>
    );
}

function Connector({ active }: { active: boolean }) {
    return (
        <div className="flex-1 h-0.5 bg-slate-200 mx-2 relative">
            <div
                className={`absolute inset-0 bg-blue-600 transition-all duration-500 ease-in-out ${active ? 'w-full' : 'w-0'}`}
            />
        </div>
    );
}
