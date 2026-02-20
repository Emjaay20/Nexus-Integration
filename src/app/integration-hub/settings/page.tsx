import { getSettings } from '@/actions/settings';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { ErpConfigForm } from '@/components/integration-hub/ErpConfigForm';
import { getCurrentUserId } from '@/lib/session';
import { integrationService } from '@/services/integrationService';
import { db } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const params = await searchParams;
    const userId = await getCurrentUserId();
    const settings = await integrationService.getSettings(userId);

    // If an ID is provided, we might be configuring a specific integration
    const integrationId = params.id;
    let erpConfig = null;

    if (integrationId === 'netsuite' || integrationId === 'sap') {
        const res = await db.query(
            'SELECT * FROM erp_connections WHERE user_id = $1 AND name = $2',
            [userId, integrationId === 'netsuite' ? 'NetSuite' : 'SAP S/4HANA']
        );
        erpConfig = res.rows[0];
    }

    const defaultSettings = {
        id: 0,
        api_key: '',
        email_alerts: false,
        slack_alerts: false,
        retention_days: 30
    };

    return (
        <div className="max-w-4xl mx-auto">
            {integrationId && (
                <div className="mb-6">
                    <Link href="/integration-hub" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 capitalize">Configure {integrationId}</h1>
                </div>
            )}

            {/* ERP Specific Config */}
            {(integrationId === 'netsuite' || integrationId === 'sap') && (
                <div className="mb-8">
                    <ErpConfigForm integrationId={integrationId} initialConfig={erpConfig} />
                </div>
            )}

            {/* General Settings (Show only if no specific integration selected, or maybe always? decided to show always below for now) */}
            {!integrationId && <SettingsForm initialSettings={settings || defaultSettings} />}
        </div>
    );
}
