'use client';

import {
    ShoppingBag,
    Users,
    Box,
    Database,
    MessageSquare,
    ArrowRight,
    CheckCircle2,
    Workflow
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Connector {
    id: string;
    name: string;
    description: string;
    category: 'E-commerce' | 'CRM' | 'PLM' | 'ERP' | 'Communication';
    status: 'available' | 'beta' | 'planned';
    icon: React.ElementType;
    color: string;
}

const connectors: Connector[] = [
    {
        id: 'shopify',
        name: 'Shopify',
        description: 'Sync orders, inventory, and customer data in real-time.',
        category: 'E-commerce',
        status: 'available',
        icon: ShoppingBag,
        color: 'bg-green-100 text-green-600',
    },
    {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Automate lead conversion and opportunity tracking.',
        category: 'CRM',
        status: 'available',
        icon: Users,
        color: 'bg-blue-100 text-blue-600',
    },
    {
        id: 'arena',
        name: 'Arena PLM',
        description: 'Trigger BOM updates and engineering change orders.',
        category: 'PLM',
        status: 'beta',
        icon: Workflow,
        color: 'bg-purple-100 text-purple-600',
    },
    {
        id: 'netsuite',
        name: 'NetSuite',
        description: 'Enterprise ERP synchronization for finance and ops.',
        category: 'ERP',
        status: 'planned',
        icon: Database,
        color: 'bg-indigo-100 text-indigo-600',
    },
    {
        id: 'sap',
        name: 'SAP S/4HANA',
        description: 'Deep integration with SAP supply chain modules.',
        category: 'ERP',
        status: 'planned',
        icon: Box,
        color: 'bg-slate-100 text-slate-600',
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Send real-time alerts to engineering channels.',
        category: 'Communication',
        status: 'available',
        icon: MessageSquare,
        color: 'bg-pink-100 text-pink-600',
    },
];

export default function ConnectorsPage() {
    const handleConnect = (connector: Connector) => {
        if (connector.status === 'planned') {
            toast('This connector is coming soon!', { icon: '🚧' });
            return;
        }
        toast.success(`Redirecting to ${connector.name} OAuth... (Demo)`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connector Marketplace</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Connect your existing tools to Nexus with one click.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectors.map((connector) => (
                    <div
                        key={connector.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx("w-12 h-12 rounded-lg flex items-center justify-center", connector.color)}>
                                <connector.icon className="w-6 h-6" />
                            </div>
                            <span className={clsx(
                                "text-xs font-semibold px-2 py-1 rounded-full border",
                                connector.status === 'available' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
                                connector.status === 'beta' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
                                connector.status === 'planned' && "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}>
                                {connector.status === 'available' ? 'Available' : connector.status === 'beta' ? 'Beta' : 'Planned'}
                            </span>
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{connector.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px]">
                            {connector.description}
                        </p>

                        <button
                            onClick={() => handleConnect(connector)}
                            disabled={connector.status === 'planned'}
                            className={clsx(
                                "w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                connector.status === 'planned'
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                                    : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                            )}
                        >
                            {connector.status === 'planned' ? (
                                <span>Coming Soon</span>
                            ) : (
                                <>
                                    Connect <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Request a Connector Section */}
            <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Don't see your tool?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    We're constantly adding new integrations. Let us know what you need.
                </p>
                <button className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Request Integration
                </button>
            </div>
        </div>
    );
}
