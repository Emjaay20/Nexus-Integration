// Force TS re-evaluation

import { RefreshCw } from 'lucide-react';
import { IntegrationCard } from '@/components/integration-hub/IntegrationCard';
import { ActivityFeed } from '@/components/integration-hub/ActivityFeed';
import { LiveActivityFeedWrapper } from '@/components/integration-hub/LiveActivityFeedWrapper';
import { integrationService } from '@/services/integrationService';
import { DemoGuide } from '@/components/demo/DemoGuide';
import { getCurrentUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function IntegrationHubPage() {
    const userId = await getCurrentUserId();
    const integrationConfigs = await integrationService.getIntegrations(userId);

    return (
        <div className="p-8">
            <DemoGuide />
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Overview of your system connections.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                    <RefreshCw className="w-4 h-4 text-slate-400" /> Refresh Status
                </button>
            </header>

            {/* Integration Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {integrationConfigs.map((config) => (
                    <IntegrationCard
                        key={config.id}
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
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="font-bold text-slate-900">Live Activity Feed</h2>
                        <p className="text-xs text-slate-500">Real-time webhooks and sync events</p>
                    </div>
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>
                <div className="p-0">
                    <LiveActivityFeedWrapper>
                        <ActivityFeed />
                    </LiveActivityFeedWrapper>
                </div>
            </div>
        </div>
    );
}
