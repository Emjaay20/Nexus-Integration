'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Zap } from 'lucide-react';
import { pusherClient } from '@/lib/pusher';

export function LiveActivityFeedWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Subscribe to Pusher channel
        const channel = pusherClient.subscribe('integration-hub');

        // Bind to event
        channel.bind('new-activity', (data: any) => {
            console.log('Real-time event received:', data);
            router.refresh();

            // Show a quick flash or indicator if needed, for now refresh is enough
            setIsRefreshing(true);
            setTimeout(() => setIsRefreshing(false), 1000);
        });

        return () => {
            pusherClient.unsubscribe('integration-hub');
        };
    }, [router]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div className="relative">
            {/* Overlay refresh indicator */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                    <Zap className="w-3 h-3 fill-current" /> LIVE
                </span>
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
