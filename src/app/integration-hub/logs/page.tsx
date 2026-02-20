import { ActivityFeed } from '@/components/integration-hub/ActivityFeed';
import { Filter } from 'lucide-react';
import { getCurrentUserId } from '@/lib/session';
import { integrationService } from '@/services/integrationService';
import { ActivityFeedFilters } from '@/components/integration-hub/ActivityFeedFilters';

export default async function LogsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; integrationId?: string }>;
}) {
    const params = await searchParams;
    const userId = await getCurrentUserId();
    const logs = await integrationService.getActivityLogs(userId, params.status, params.integrationId);

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
                    <p className="text-slate-500">
                        {params.integrationId
                            ? `Showing history for integration: ${params.integrationId}`
                            : 'Full history of system integration events.'}
                    </p>
                </div>
                {/* Removed generic filter button in favor of inline filters for now, or keep it as a placeholder */}
            </header>

            <div className="mb-6">
                <ActivityFeedFilters />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-0">
                    <ActivityFeed initialLogs={logs} />
                </div>
            </div>
        </div>
    );
}
