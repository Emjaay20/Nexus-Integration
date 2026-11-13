'use client';

import { MetricsOverview } from './MetricsOverview';
import { EventsChart } from './EventsChart';
import { StatusBreakdown } from './StatusBreakdown';
import { IntegrationHealth } from './IntegrationHealth';

interface AnalyticsDashboardProps {
    totalEvents: number;
    successRate: number;
    failureCount: number;
    avgResponseTime: string;
    eventsPerDay: { day: string; success: number; failure: number }[];
    statusBreakdown: { name: string; value: number; color: string }[];
    integrationHealth: { integration: string; success: number; failure: number; total: number }[];
}

export function AnalyticsDashboard(props: AnalyticsDashboardProps) {
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <MetricsOverview
                totalEvents={props.totalEvents}
                successRate={props.successRate}
                failureCount={props.failureCount}
                avgResponseTime={props.avgResponseTime}
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <EventsChart data={props.eventsPerDay} />
                </div>
                <div>
                    <StatusBreakdown data={props.statusBreakdown} />
                </div>
            </div>

            {/* Integration Health */}
            <IntegrationHealth data={props.integrationHealth} />
        </div>
    );
}
