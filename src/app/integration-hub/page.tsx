// Force TS re-evaluation

import { RefreshCw, Activity, Wifi, Clock, AlertTriangle } from 'lucide-react';
import { IntegrationCard } from '@/components/integration-hub/IntegrationCard';
import { ActivityFeed } from '@/components/integration-hub/ActivityFeed';
import { LiveActivityFeedWrapper } from '@/components/integration-hub/LiveActivityFeedWrapper';
import { GettingStartedBanner } from '@/components/integration-hub/GettingStartedBanner';
import { ActivityFeedFilters } from '@/components/integration-hub/ActivityFeedFilters';
import { integrationService } from '@/services/integrationService';
import { getCurrentUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function IntegrationHubPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const params = await searchParams;
    const statusFilter = params.status || 'all';
    const userId = await getCurrentUserId();

    const [integrationConfigs, stats, activityLogs] = await Promise.all([
        integrationService.getIntegrations(userId),
        integrationService.getDashboardStats(userId),
        integrationService.getActivityLogs(userId, statusFilter),
    ]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Overview of your system connections.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                    <RefreshCw className="w-4 h-4 text-slate-400" /> Refresh Status
                </button>
            </header>

            <GettingStartedBanner />

            {/* Anchor Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                        <Wifi className="w-3.5 h-3.5" /> Active Integrations
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900">{stats.activeIntegrations}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                        <Activity className="w-3.5 h-3.5" /> Events Today
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900">{stats.eventsToday}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                        <Clock className="w-3.5 h-3.5" /> Avg Latency
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900">{stats.avgLatency}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Failures Today
                    </div>
                    <div className={`text-2xl font-extrabold ${stats.failuresToday > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.failuresToday}</div>
                </div>
            </div>

            {/* Integration Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {integrationConfigs.map((config) => (
                    <IntegrationCard
                        key={config.id}
                        id={config.id}
                        name={config.name}
                        source={config.source}
                        destination={config.destination}
                        status={config.status}
                        lastRun={config.lastRun}
                        uptime={config.uptime}
                    />
                ))}
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-slate-900">Activity Feed</h2>
                        <p className="text-xs text-slate-500">Real-time webhooks and sync events</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-2 border-b border-slate-100">
                    <ActivityFeedFilters />
                </div>

                <div className="p-0">
                    <LiveActivityFeedWrapper>
                        <ActivityFeed initialLogs={activityLogs} />
                    </LiveActivityFeedWrapper>
                </div>
            </div>
        </div>
    );
}

