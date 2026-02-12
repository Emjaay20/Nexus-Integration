import { integrationService } from '@/services/integrationService';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export default async function AnalyticsPage() {
    const [eventsPerDay, statusBreakdown, integrationHealth, logs] = await Promise.all([
        integrationService.getEventsPerDay(30),
        integrationService.getStatusBreakdown(),
        integrationService.getIntegrationHealth(),
        integrationService.getActivityLogs(),
    ]);

    // Compute KPI metrics
    const totalEvents = statusBreakdown.reduce((sum, d) => sum + d.value, 0);
    const successCount = statusBreakdown.find(d => d.name === 'Success')?.value || 0;
    const failureCount = statusBreakdown.find(d => d.name === 'Failed')?.value || 0;
    const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 100;

    // Avg response time from logs
    const durations = logs
        .map(l => l.duration)
        .filter(Boolean)
        .map(d => parseInt(d!.replace('ms', '')))
        .filter(d => !isNaN(d));
    const avgResponseTime = durations.length > 0
        ? `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}ms`
        : '~120ms';

    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900">Analytics</h1>
                    <p className="text-slate-500 mt-1">Monitor integration performance and health metrics.</p>
                </div>

                <AnalyticsDashboard
                    totalEvents={totalEvents}
                    successRate={successRate}
                    failureCount={failureCount}
                    avgResponseTime={avgResponseTime}
                    eventsPerDay={eventsPerDay}
                    statusBreakdown={statusBreakdown}
                    integrationHealth={integrationHealth}
                />
            </div>
        </div>
    );
}
