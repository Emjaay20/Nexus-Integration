import { integrationService } from '@/services/integrationService';
import { getCurrentUserId } from '@/lib/session';
import ConnectorsList from './ConnectorsList';

export default async function ConnectorsPage() {
    const userId = await getCurrentUserId();
    const activeIntegrations = await integrationService.getIntegrations(userId);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connector Marketplace</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Connect your existing tools to Nexus with one click.
                </p>
            </header>

            <ConnectorsList activeIntegrations={activeIntegrations} />

            {/* Request a Connector Section */}
            <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Don&apos;t see your tool?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    We&apos;re constantly adding new integrations. Let us know what you need.
                </p>
                <a
                    href="mailto:youngmj2010@gmail.com?subject=Request%20Integration"
                    className="inline-block px-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Request Integration
                </a>
            </div>
        </div>
    );
}
