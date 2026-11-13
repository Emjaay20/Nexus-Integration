'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Activity, Terminal, BarChart3, ArrowRight, ArrowLeft, CheckCircle2, LayoutGrid } from 'lucide-react';

const steps = [
    {
        icon: LayoutGrid,
        title: 'Welcome to Nexus',
        subtitle: 'Your supply chain integration command center',
        description: 'Nexus connects your ERPs, e-commerce platforms, and supply chain tools into a single dashboard. Monitor data flows, import BOMs, and track integration health — all in real time.',
        color: 'bg-blue-600',
        lightBg: 'bg-blue-50',
        textColor: 'text-blue-600',
    },
    {
        icon: Upload,
        title: 'Import your Bill of Materials',
        subtitle: 'Clean, validate, and standardize your data',
        description: 'Upload a CSV or Excel file containing your BOM data. Nexus will auto-detect columns, let you map them to a standard schema, validate every row, and flag errors before import. Try it with our sample CSV file.',
        color: 'bg-emerald-600',
        lightBg: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        href: '/bom-importer',
        cta: 'Try BOM Importer',
    },
    {
        icon: Activity,
        title: 'Monitor your integrations',
        subtitle: 'Real-time dashboard with live activity feed',
        description: 'The Integration Hub shows all connected systems (Shopify, Salesforce, Arena PLM) with live status indicators, activity logs, and anchor metrics. Events appear instantly via WebSocket — no page refresh needed.',
        color: 'bg-violet-600',
        lightBg: 'bg-violet-50',
        textColor: 'text-violet-600',
        href: '/integration-hub',
        cta: 'Open Integration Hub',
    },
    {
        icon: Terminal,
        title: 'Test with the API Playground',
        subtitle: 'Send webhook events and watch them flow',
        description: 'Use the API Playground to simulate incoming webhooks from external systems. Choose from pre-built templates (Shopify, Salesforce, Arena) or write custom payloads. Fire a failure event to see the auto-retry → recovery lifecycle.',
        color: 'bg-amber-600',
        lightBg: 'bg-amber-50',
        textColor: 'text-amber-600',
        href: '/developer/playground',
        cta: 'Open Playground',
    },
    {
        icon: BarChart3,
        title: 'Analyze & connect external systems',
        subtitle: 'Charts, API keys, and production-ready webhooks',
        description: 'View analytics dashboards with activity trends and status breakdowns. Go to Settings to grab your API key — use it to send authenticated webhooks from any external system via curl, JavaScript, or Python. Check the docs page for code examples.',
        color: 'bg-rose-600',
        lightBg: 'bg-rose-50',
        textColor: 'text-rose-600',
        href: '/docs',
        cta: 'Read the Docs',
    },
];

export default function OnboardingPage() {
    const [current, setCurrent] = useState(0);
    const step = steps[current];
    const Icon = step.icon;
    const isLast = current === steps.length - 1;
    const isFirst = current === 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-blue-600' : i < current ? 'w-2 bg-blue-300' : 'w-2 bg-slate-300 dark:bg-slate-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Step card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-10 text-center"
                    >
                        <div className={`w-16 h-16 ${step.lightBg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                            <Icon className={`w-8 h-8 ${step.textColor}`} />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{step.subtitle}</p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto mb-8">
                            {step.description}
                        </p>

                        {step.href && (
                            <Link
                                href={step.href}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 ${step.color} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity mb-4`}
                            >
                                {step.cta} <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                    <button
                        onClick={() => setCurrent(Math.max(0, current - 1))}
                        disabled={isFirst}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    {isLast ? (
                        <Link
                            href="/integration-hub"
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Go to Dashboard
                        </Link>
                    ) : (
                        <button
                            onClick={() => setCurrent(current + 1)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                        >
                            Next <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Skip link */}
                <div className="text-center mt-6">
                    <Link
                        href="/integration-hub"
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        Skip onboarding →
                    </Link>
                </div>
            </div>
        </div>
    );
}
