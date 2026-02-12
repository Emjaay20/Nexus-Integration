'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

interface JsonViewerProps {
    data: string | object | null | undefined;
    title?: string;
}

export function JsonViewer({ data, title }: JsonViewerProps) {
    const [copied, setCopied] = useState(false);

    let parsed: object | null = null;
    let raw = '';

    if (typeof data === 'string') {
        try {
            parsed = JSON.parse(data);
            raw = JSON.stringify(parsed, null, 2);
        } catch {
            raw = data;
        }
    } else if (data && typeof data === 'object') {
        parsed = data;
        raw = JSON.stringify(parsed, null, 2);
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(raw || '// No data');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    };

    if (!raw) {
        return (
            <div className="bg-slate-900 rounded-lg p-4">
                <pre className="text-xs text-slate-500 font-mono italic">// No data available</pre>
            </div>
        );
    }

    return (
        <div className="relative group">
            {title && (
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                            </>
                        )}
                    </button>
                </div>
            )}
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto max-h-80 overflow-y-auto">
                <pre className="text-xs font-mono">
                    {parsed ? <JsonNode data={parsed} depth={0} /> : <span className="text-slate-300">{raw}</span>}
                </pre>
            </div>
        </div>
    );
}

function JsonNode({ data, depth }: { data: any; depth: number }) {
    const [collapsed, setCollapsed] = useState(depth > 2);
    const indent = '  '.repeat(depth);
    const childIndent = '  '.repeat(depth + 1);

    if (data === null) return <span className="text-orange-400">null</span>;
    if (typeof data === 'boolean') return <span className="text-orange-400">{String(data)}</span>;
    if (typeof data === 'number') return <span className="text-amber-300">{data}</span>;
    if (typeof data === 'string') return <span className="text-emerald-400">&quot;{data}&quot;</span>;

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-slate-400">[]</span>;
        if (collapsed) {
            return (
                <span>
                    <button onClick={() => setCollapsed(false)} className="text-slate-400 hover:text-white inline-flex items-center">
                        <ChevronRight className="w-3 h-3 inline" />
                        <span className="text-slate-500">Array[{data.length}]</span>
                    </button>
                </span>
            );
        }
        return (
            <span>
                <button onClick={() => setCollapsed(true)} className="text-slate-400 hover:text-white inline-flex items-center">
                    <ChevronDown className="w-3 h-3 inline" />
                </button>
                {'[\n'}
                {data.map((item, i) => (
                    <span key={i}>
                        {childIndent}<JsonNode data={item} depth={depth + 1} />
                        {i < data.length - 1 ? ',\n' : '\n'}
                    </span>
                ))}
                {indent}{']'}
            </span>
        );
    }

    if (typeof data === 'object') {
        const entries = Object.entries(data);
        if (entries.length === 0) return <span className="text-slate-400">{'{}'}</span>;
        if (collapsed) {
            return (
                <span>
                    <button onClick={() => setCollapsed(false)} className="text-slate-400 hover:text-white inline-flex items-center">
                        <ChevronRight className="w-3 h-3 inline" />
                        <span className="text-slate-500">{`{${entries.length} keys}`}</span>
                    </button>
                </span>
            );
        }
        return (
            <span>
                <button onClick={() => setCollapsed(true)} className="text-slate-400 hover:text-white inline-flex items-center">
                    <ChevronDown className="w-3 h-3 inline" />
                </button>
                {'{\n'}
                {entries.map(([key, val], i) => (
                    <span key={key}>
                        {childIndent}<span className="text-blue-300">&quot;{key}&quot;</span>
                        <span className="text-slate-400">: </span>
                        <JsonNode data={val} depth={depth + 1} />
                        {i < entries.length - 1 ? ',\n' : '\n'}
                    </span>
                ))}
                {indent}{'}'}
            </span>
        );
    }

    return <span className="text-slate-300">{String(data)}</span>;
}
