'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function LiveActivityFeedWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Poll every 3 seconds to keep feed fresh
        const interval = setInterval(() => {
            router.refresh();
        }, 3000);

        return () => clearInterval(interval);
    }, [router]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div className="relative">
            {/* Overlay refresh indicator */}
            <div className="absolute top-2 right-2 z-10">
                <button
                    onClick={handleRefresh}
                    className="p-1.5 bg-white/80 backdrop-blur rounded-full hover:bg-white border border-slate-200 shadow-sm transition-all"
                    title="Refresh Feed"
                >
                    <RefreshCw className={`w-3 h-3 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {children}
        </div>
    );
}
