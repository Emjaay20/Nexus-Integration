import { Check, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { integrationService } from '@/services/integrationService';
import { getCurrentUserId } from '@/lib/session';
import Link from 'next/link';

const statusConfig = {
    success: {
        icon: Check,
        bg: 'bg-white',
        border: 'border-slate-200',
        text: 'text-green-500',
        label: null,
    },
    failure: {
        icon: X,
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-500',
        label: { text: 'Failed', color: 'bg-red-100 text-red-700 border-red-200' },
    },
    retrying: {
        icon: RefreshCw,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-500',
        label: { text: 'Retrying', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    },
    recovered: {
        icon: CheckCircle2,
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
        label: { text: 'Recovered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    },
};

import { IntegrationLog } from '@/types/integration';

// Display a list of recent integration activities
export function ActivityFeed({ initialLogs }: { initialLogs: IntegrationLog[] }) {
    const logs = initialLogs;

    return (
        <div className="divide-y divide-slate-100">
            {logs.map((log) => {
                const config = statusConfig[log.status] || statusConfig.success;
                const Icon = config.icon;

                return (
                    <Link href={`/integration-hub/logs/${log.id}`} key={log.id} className="block hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4 p-4">
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
                                config.bg, config.border, config.text,
                                log.status === 'retrying' && 'animate-spin-slow'
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-slate-800 text-sm">{log.event}</h4>
                                        {config.label && (
                                            <span className={clsx(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                                                config.label.color
                                            )}>
                                                {config.label.text}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">{log.time}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{log.integration}</p>
                            </div>

                            <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">View Logs</span>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
