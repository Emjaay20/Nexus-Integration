import { ArrowLeft } from 'lucide-react';
import { integrationService } from '@/services/integrationService';
import { getCurrentUserId } from '@/lib/session';
import Link from 'next/link';
import { LogDetailClient } from '@/components/integration-hub/LogDetailClient';

export default async function IntegrationLogPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const userId = await getCurrentUserId();
    const log = await integrationService.getLogById(userId, id);

    if (!log) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Log Not Found</h1>
                    <Link href="/integration-hub" className="text-indigo-600 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const relatedLogs = await integrationService.getRelatedLogs(userId, log.integration, id, 5);

    return (
        <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] p-8">
            <div className="max-w-6xl mx-auto">
                <Link href="/integration-hub/logs" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Logs
                </Link>

                <LogDetailClient log={log} relatedLogs={relatedLogs} />
            </div>
        </div>
    );
}
