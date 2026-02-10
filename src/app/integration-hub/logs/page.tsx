
import { ActivityFeed } from '@/components/integration-hub/ActivityFeed';
import { Filter } from 'lucide-react';

export default function LogsPage() {
    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
                    <p className="text-slate-500">Full history of system integration events.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                    <Filter className="w-4 h-4 text-slate-400" /> Filter Overview
                </button>
            </header>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-0">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
