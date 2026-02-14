'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white font-[family-name:var(--font-geist-sans)]">
            <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-sm font-bold uppercase tracking-wider text-red-500 mb-3">Error</p>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Something went wrong</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                </button>
            </div>
        </div>
    );
}
