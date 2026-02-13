import { Check, X, Box, ShoppingCart, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { integrationService } from '@/services/integrationService';
import { getCurrentUserId } from '@/lib/session';
import Link from 'next/link';

// Display a list of recent integration activities
export async function ActivityFeed() {
    const userId = await getCurrentUserId();
    const logs = await integrationService.getActivityLogs(userId);

    return (
        <div className="divide-y divide-slate-100">
            {logs.map((log) => (
                <Link href={`/integration-hub/logs/${log.id}`} key={log.id} className="block hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4 p-4">
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
                            log.status === 'success' ? "bg-white border-slate-200 text-green-500" : "bg-red-50 border-red-200 text-red-500"
                        )}>
                            {log.status === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-medium text-slate-800 text-sm">{log.event}</h4>
                                <span className="text-xs text-slate-400 whitespace-nowrap">{log.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{log.integration}</p>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">View Logs</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
