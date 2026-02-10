
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { RawRow } from '@/lib/file-parser';

export interface ColumnMapping {
    partNumber: string;
    quantity: string;
    description: string;
    manufacturer: string;
}

interface ColumnMapperProps {
    headers: string[];
    data: RawRow[];
    onConfirm: (mapping: ColumnMapping) => void;
    onBack: () => void;
}

const REQUIRED_FIELDS = ['partNumber', 'quantity'];

export function ColumnMapper({ headers, data, onConfirm, onBack }: ColumnMapperProps) {
    const [mapping, setMapping] = useState<ColumnMapping>({
        partNumber: '',
        quantity: '',
        description: '',
        manufacturer: ''
    });

    // Auto-map attempts based on common header names
    useEffect(() => {
        const newMapping = { ...mapping };
        const lowerHeaders = headers.map(h => h.toLowerCase());

        const findMatch = (terms: string[]) => {
            const index = lowerHeaders.findIndex(h => terms.some(term => h.includes(term)));
            return index !== -1 ? headers[index] : '';
        };

        if (!newMapping.partNumber) newMapping.partNumber = findMatch(['part', 'mpn', 'sku', 'product']);
        if (!newMapping.quantity) newMapping.quantity = findMatch(['qty', 'quantity', 'amount', 'count']);
        if (!newMapping.description) newMapping.description = findMatch(['desc', 'detail', 'name']);
        if (!newMapping.manufacturer) newMapping.manufacturer = findMatch(['mfr', 'manuf', 'brand', 'vendor']);

        setMapping(newMapping);
    }, []); // Run once on mount

    const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
        setMapping(prev => ({ ...prev, [field]: value }));
    };

    const isValid = REQUIRED_FIELDS.every(field => mapping[field as keyof ColumnMapping]);

    const previewRows = data.slice(0, 3); // Show first 3 rows

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
        >
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Map Support Columns</h2>
                <p className="text-slate-500">Macthing your file columns to our system fields.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Mapping Form */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Field Mapping</h3>

                    <MappingField
                        label="Part Number"
                        value={mapping.partNumber}
                        options={headers}
                        required
                        onChange={(v) => handleMappingChange('partNumber', v)}
                    />
                    <MappingField
                        label="Quantity"
                        value={mapping.quantity}
                        options={headers}
                        required
                        onChange={(v) => handleMappingChange('quantity', v)}
                    />
                    <MappingField
                        label="Description"
                        value={mapping.description}
                        options={headers}
                        onChange={(v) => handleMappingChange('description', v)}
                    />
                    <MappingField
                        label="Manufacturer"
                        value={mapping.manufacturer}
                        options={headers}
                        onChange={(v) => handleMappingChange('manufacturer', v)}
                    />
                </div>

                {/* Live Preview */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-800 mb-4">Preview</h3>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-sm">
                        <div className="grid grid-cols-2 bg-slate-100 p-2 font-medium text-slate-600 border-b border-slate-200">
                            <div>Parameter</div>
                            <div>Preview Value (Row 1)</div>
                        </div>
                        {Object.keys(mapping).map((key) => {
                            const mappedHeader = mapping[key as keyof ColumnMapping];
                            const previewValue = mappedHeader && previewRows.length > 0 ? previewRows[0][mappedHeader] : '-';

                            return (
                                <div key={key} className="grid grid-cols-2 p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <div className="capitalize text-slate-700">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                    <div className={clsx("truncate", !mappedHeader && "text-slate-400 italic")}>
                                        {String(previewValue)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 text-xs text-slate-400 text-center">
                        Showing values from the first row of your file.
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-8">
                <button
                    onClick={onBack}
                    className="text-slate-500 hover:text-slate-800 px-4 py-2 font-medium"
                >
                    Back to Upload
                </button>

                <button
                    disabled={!isValid}
                    onClick={() => onConfirm(mapping)}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                        isValid
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                >
                    Confirm Mapping <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

function MappingField({ label, value, options, onChange, required }: {
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void,
    required?: boolean
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 flex justify-between">
                {label}
                {required && <span className="text-red-500 text-xs">*Required</span>}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={clsx(
                    "w-full p-2.5 rounded-lg border bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all",
                    !value && required ? "border-amber-300 focus:ring-amber-200" : "border-slate-300"
                )}
            >
                <option value="">-- Select Column --</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}
