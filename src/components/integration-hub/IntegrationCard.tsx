'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, ArrowRight, Play, Settings, MoreVertical, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { IntegrationStatus } from '@/types/integration';
import { getSystemConfig } from '@/config/integration-types';
import { triggerSync } from '@/actions/integration-actions';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface IntegrationCardProps {
    id: string; // Added ID prop
    name: string;
    source: string;
    destination: string;
    status: IntegrationStatus;
    lastRun: string;
    uptime: string;
}

export function IntegrationCard({ id, name, source, destination, status, lastRun, uptime }: IntegrationCardProps) {
    const sourceConfig = getSystemConfig(source);
    const destConfig = getSystemConfig(destination);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        toast.loading('Sync started...', { id: 'sync-toast' });
        try {
            const result = await triggerSync(id);
            if (result.success) {
                toast.success('Sync completed successfully', { id: 'sync-toast' });
            } else {
                toast.error('Sync failed. Check logs.', { id: 'sync-toast' });
            }
        } catch (error) {
            toast.error('Failed to trigger sync', { id: 'sync-toast' });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow relative group">
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
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            {name}
                            {(source === 'shopify' || source === 'netsuite' || source === 'sap' || source === 'katana') && status === 'healthy' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                                    Live
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            {sourceConfig.name} <ArrowRight className="w-3 h-3" /> {destConfig.name}
                        </p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 text-sm mb-4">
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

            <div className="flex gap-2">
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
                {/* Dropdown Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex items-center justify-center px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-20 py-1">
                                <Link
                                    href={`/integration-hub/logs?integrationId=${id}`}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    <Clock className="w-4 h-4 text-slate-400" /> View Logs
                                </Link>
                                <Link
                                    href={`/integration-hub/settings?id=${id}`}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                                </Link>
                            </div>
                        </>
                    )}
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
