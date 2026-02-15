'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Upload, Terminal, Zap, Activity } from 'lucide-react';

export function GettingStartedBanner() {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const steps = [
        {
            icon: Upload,
            title: 'Import a BOM',
            description: 'Upload a CSV or Excel file to validate your supply chain data.',
            href: '/bom-importer',
            color: 'bg-blue-50 text-blue-600 border-blue-200',
        },
        {
            icon: Terminal,
            title: 'Open the API Playground',
            description: 'Send test webhook events from Shopify, Salesforce, or Arena.',
            href: '/developer/playground',
            color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        },
        {
            icon: Zap,
            title: 'Fire a failure event',
            description: 'Click "Failure → Retry" to see the auto-recovery lifecycle.',
            href: '/developer/playground',
            color: 'bg-amber-50 text-amber-600 border-amber-200',
        },
        {
            icon: Activity,
            title: 'Watch the live feed',
            description: 'Events appear in real time on your dashboard activity feed.',
            href: '/integration-hub',
            color: 'bg-violet-50 text-violet-600 border-violet-200',
        },
    ];

    return (
        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 relative">
            <button
                onClick={() => setDismissed(true)}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">Getting Started</h2>
                <p className="text-sm text-slate-500">Follow these steps to explore the full platform in under 2 minutes.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {steps.map((step, i) => (
                    <Link
                        key={i}
                        href={step.href}
                        className="group flex flex-col gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${step.color}`}>
                                <step.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-400">Step {i + 1}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{step.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
