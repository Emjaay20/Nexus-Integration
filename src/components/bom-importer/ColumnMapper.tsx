
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, AlertCircle, Sparkles, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
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

// Extended matching dictionary with confidence tiers
const FIELD_PATTERNS: Record<keyof ColumnMapping, { high: string[]; medium: string[]; low: string[] }> = {
    partNumber: {
        high: ['part_number', 'partnumber', 'part number', 'mpn', 'mfr_part', 'mfr part'],
        medium: ['sku', 'item_no', 'item no', 'item_number', 'item number', 'component', 'ref_des', 'reference'],
        low: ['part', 'product', 'id', 'code', 'number'],
    },
    quantity: {
        high: ['quantity', 'qty'],
        medium: ['amount', 'count', 'qty_required', 'qty required', 'units'],
        low: ['num', 'total'],
    },
    description: {
        high: ['description', 'desc'],
        medium: ['detail', 'details', 'component_description', 'part_description', 'specification'],
        low: ['name', 'title', 'label', 'info'],
    },
    manufacturer: {
        high: ['manufacturer', 'mfr', 'mfg'],
        medium: ['manuf', 'brand', 'vendor', 'supplier', 'maker'],
        low: ['company', 'source', 'origin'],
    },
};

type Confidence = 'high' | 'medium' | 'low' | 'manual';

interface MappingWithConfidence {
    value: string;
    confidence: Confidence;
}

function computeConfidence(header: string, field: keyof ColumnMapping): Confidence {
    const lower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    const patterns = FIELD_PATTERNS[field];

    for (const term of patterns.high) {
        if (lower === term.replace(/[^a-z0-9]/g, '') || lower.includes(term.replace(/[^a-z0-9]/g, ''))) return 'high';
    }
    for (const term of patterns.medium) {
        if (lower === term.replace(/[^a-z0-9]/g, '') || lower.includes(term.replace(/[^a-z0-9]/g, ''))) return 'medium';
    }
    for (const term of patterns.low) {
        if (lower === term.replace(/[^a-z0-9]/g, '') || lower.includes(term.replace(/[^a-z0-9]/g, ''))) return 'low';
    }
    return 'manual';
}

function getBestMatch(headers: string[], field: keyof ColumnMapping, taken: Set<string>): MappingWithConfidence {
    const candidates: { header: string; confidence: Confidence; tier: number }[] = [];

    for (const header of headers) {
        if (taken.has(header)) continue;
        const confidence = computeConfidence(header, field);
        if (confidence !== 'manual') {
            const tier = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
            candidates.push({ header, confidence, tier });
        }
    }

    candidates.sort((a, b) => b.tier - a.tier);
    return candidates.length > 0
        ? { value: candidates[0].header, confidence: candidates[0].confidence }
        : { value: '', confidence: 'manual' };
}

const CONFIDENCE_META: Record<Confidence, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
    high: { label: 'High confidence', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    medium: { label: 'Medium confidence', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    low: { label: 'Low confidence', icon: HelpCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
    manual: { label: 'Manual selection', icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
};

export function ColumnMapper({ headers, data, onConfirm, onBack }: ColumnMapperProps) {
    const [mapping, setMapping] = useState<ColumnMapping>({
        partNumber: '',
        quantity: '',
        description: '',
        manufacturer: ''
    });

    const [confidences, setConfidences] = useState<Record<keyof ColumnMapping, Confidence>>({
        partNumber: 'manual',
        quantity: 'manual',
        description: 'manual',
        manufacturer: 'manual',
    });

    // Smart auto-map with confidence scoring
    useEffect(() => {
        const newMapping: ColumnMapping = { partNumber: '', quantity: '', description: '', manufacturer: '' };
        const newConfidences: Record<keyof ColumnMapping, Confidence> = { partNumber: 'manual', quantity: 'manual', description: 'manual', manufacturer: 'manual' };
        const taken = new Set<string>();

        // Process fields in priority order (required first)
        const fieldOrder: (keyof ColumnMapping)[] = ['partNumber', 'quantity', 'description', 'manufacturer'];
        for (const field of fieldOrder) {
            const match = getBestMatch(headers, field, taken);
            if (match.value) {
                newMapping[field] = match.value;
                newConfidences[field] = match.confidence;
                taken.add(match.value);
            }
        }

        setMapping(newMapping);
        setConfidences(newConfidences);
    }, [headers]);

    const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
        setMapping(prev => ({ ...prev, [field]: value }));
        setConfidences(prev => ({ ...prev, [field]: value ? 'manual' : 'manual' }));
    };

    const isValid = REQUIRED_FIELDS.every(field => mapping[field as keyof ColumnMapping]);
    const autoMappedCount = Object.values(confidences).filter(c => c !== 'manual').length;

    const previewRows = data.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
        >
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Map Your Columns</h2>
                <p className="text-slate-500">Matching your file columns to our system fields.</p>
                {autoMappedCount > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        AI auto-mapped {autoMappedCount} of {Object.keys(mapping).length} fields
                    </div>
                )}
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
                        confidence={confidences.partNumber}
                        onChange={(v) => handleMappingChange('partNumber', v)}
                    />
                    <MappingField
                        label="Quantity"
                        value={mapping.quantity}
                        options={headers}
                        required
                        confidence={confidences.quantity}
                        onChange={(v) => handleMappingChange('quantity', v)}
                    />
                    <MappingField
                        label="Description"
                        value={mapping.description}
                        options={headers}
                        confidence={confidences.description}
                        onChange={(v) => handleMappingChange('description', v)}
                    />
                    <MappingField
                        label="Manufacturer"
                        value={mapping.manufacturer}
                        options={headers}
                        confidence={confidences.manufacturer}
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

function MappingField({ label, value, options, onChange, required, confidence }: {
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void,
    required?: boolean,
    confidence?: Confidence,
}) {
    const meta = confidence ? CONFIDENCE_META[confidence] : null;
    const Icon = meta?.icon;

    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                    {label}
                    {meta && value && confidence !== 'manual' && Icon && (
                        <span className={clsx("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full", meta.bg, meta.color)}>
                            <Icon className="w-3 h-3" />
                            {meta.label}
                        </span>
                    )}
                </span>
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
