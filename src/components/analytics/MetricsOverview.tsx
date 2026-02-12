'use client';

import { Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface MetricsOverviewProps {
    totalEvents: number;
    successRate: number;
    failureCount: number;
    avgResponseTime: string;
}

export function MetricsOverview({ totalEvents, successRate, failureCount, avgResponseTime }: MetricsOverviewProps) {
    const cards = [
        {
            label: 'Total Events',
            value: totalEvents.toLocaleString(),
            icon: Activity,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
        },
        {
            label: 'Success Rate',
            value: `${successRate.toFixed(1)}%`,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
        },
        {
            label: 'Failures',
            value: failureCount.toLocaleString(),
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-100',
        },
        {
            label: 'Avg Response',
            value: avgResponseTime,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className={`bg-white rounded-xl border ${card.border} p-5 flex items-start justify-between hover:shadow-md transition-shadow`}
                >
                    <div>
                        <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}>
                        <card.icon className="w-5 h-5" />
                    </div>
                </div>
            ))}
        </div>
    );
}
