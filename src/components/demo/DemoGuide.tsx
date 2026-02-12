'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function DemoGuide() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between relative animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 text-2xl">
                    👋
                </div>
                <div>
                    <h3 className="text-indigo-900 font-bold mb-1">Testing the Real-Time Feed?</h3>
                    <p className="text-indigo-700 text-sm mb-3">
                        Use our simulator to send fake data events to this dashboard and watch it react instantly.
                    </p>
                    <Link
                        href="/developer/playground"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Open Simulator <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="text-indigo-400 hover:text-indigo-600 p-1"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
