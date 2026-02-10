import { CheckCircle, AlertTriangle, XCircle, Clock, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { IntegrationStatus } from '@/types/integration';
import { getSystemConfig } from '@/config/integration-types';

interface IntegrationCardProps {
    name: string;
    source: string;
    destination: string;
    status: IntegrationStatus;
    lastRun: string;
    uptime: string;
}

export function IntegrationCard({ name, source, destination, status, lastRun, uptime }: IntegrationCardProps) {
    const sourceConfig = getSystemConfig(source);
    const destConfig = getSystemConfig(destination);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm z-10", sourceConfig.color)}>
                            <sourceConfig.icon className="w-5 h-5" />
                        </div>
                        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm z-0 relative", destConfig.color)}>
                            <destConfig.icon className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">{name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            {sourceConfig.name} <ArrowRight className="w-3 h-3" /> {destConfig.name}
                        </p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 text-sm">
                <div>
                    <p className="text-slate-400 text-xs mb-1">Last Sync</p>
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {lastRun}
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 text-xs mb-1">Uptime</p>
                    <p className="text-slate-700 font-medium">{uptime}</p>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'healthy') return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold ring-1 ring-green-600/20">
            <CheckCircle className="w-3 h-3" /> Healthy
        </span>
    );
    if (status === 'warning') return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold ring-1 ring-amber-600/20">
            <AlertTriangle className="w-3 h-3" /> Warning
        </span>
    );
    return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold ring-1 ring-red-600/20">
            <XCircle className="w-3 h-3" /> Error
        </span>
    );
}
