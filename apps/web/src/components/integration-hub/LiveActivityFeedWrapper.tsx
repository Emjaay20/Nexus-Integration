'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { pusherClient } from '@/lib/pusher';
import { useSession } from 'next-auth/react';

const realtimeConfigured = Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);

export function LiveActivityFeedWrapper({
    children,
    userId,
}: {
    children: React.ReactNode;
    userId?: string;
}) {
    const router = useRouter();
    const { data: session } = useSession();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const activeUserId = userId || session?.user?.id;

    useEffect(() => {
        if (!activeUserId || !realtimeConfigured) return;

        // Enforce per-user private Pusher channel
        const channelName = `private-user-${activeUserId}`;
        const channel = pusherClient.subscribe(channelName);

        channel.bind('new-activity', () => {
            router.refresh();
            setIsRefreshing(true);
            setTimeout(() => setIsRefreshing(false), 800);
        });

        return () => {
            pusherClient.unsubscribe(channelName);
        };
    }, [router, activeUserId]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {realtimeConfigured ? 'ACTIVITY FEED' : 'MANUAL REFRESH'}
                </span>
                <button
                    onClick={handleRefresh}
                    className="p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    title="Refresh Feed"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {children}
        </div>
    );
}
