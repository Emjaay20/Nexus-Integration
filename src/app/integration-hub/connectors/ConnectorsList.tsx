'use client';

import { connectIntegration } from '@/actions/connectors';
import {
    ShoppingBag,
    Users,
    Box,
    Database,
    MessageSquare,
    Workflow,
    Factory,
    ArrowRight,
    CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface Connector {
    id: string;
    name: string;
    description: string;
    category: 'E-commerce' | 'CRM' | 'PLM' | 'ERP' | 'Communication';
    status: 'available' | 'beta' | 'planned';
    icon: React.ElementType;
    color: string;
    authType?: 'oauth' | 'api_key' | 'simulated';
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
        authType: 'oauth',
    },
    {
        id: 'katana',
        name: 'Katana MRP',
        description: 'Sync sales orders, BOMs, inventory & manufacturing in real-time.',
        category: 'ERP',
        status: 'available',
        icon: Factory,
        color: 'bg-emerald-100 text-emerald-600',
        authType: 'api_key',
    },
    {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Automate lead conversion and opportunity tracking.',
        category: 'CRM',
        status: 'planned',
        icon: Users,
        color: 'bg-blue-100 text-blue-600',
        authType: 'oauth',
    },
    {
        id: 'arena',
        name: 'Arena PLM',
        description: 'Trigger BOM updates and engineering change orders.',
        category: 'PLM',
        status: 'planned',
        icon: Workflow,
        color: 'bg-purple-100 text-purple-600',
        authType: 'simulated',
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
        status: 'planned',
        icon: MessageSquare,
        color: 'bg-pink-100 text-pink-600',
        authType: 'simulated',
    },
];

interface ConnectorsListProps {
    activeIntegrations: { id: string }[];
}

export default function ConnectorsList({ activeIntegrations }: ConnectorsListProps) {
    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    const activeIntegrationIds = new Set(activeIntegrations.map(i => i.id));

    const handleConnect = async (connector: Connector) => {
        if (connector.status === 'planned') {
            toast('This connector is coming soon!', { icon: '🚧' });
            return;
        }

        let shopDomain = '';
        let credentials: { apiKey?: string } | undefined;

        if (connector.id === 'shopify') {
            const input = window.prompt("Please enter your Shopify store domain (e.g., my-store.myshopify.com):");
            if (!input) return;
            shopDomain = input.replace('https://', '').replace('http://', '').replace(/\/$/, '');
            if (!shopDomain.includes('myshopify.com')) {
                shopDomain += '.myshopify.com';
            }
        }

        if (connector.id === 'katana') {
            const apiKey = window.prompt(
                "Enter your Katana API Key.\n\nYou can find it in Katana → Settings → API → API Keys.\n\nPaste your key below:"
            );
            if (!apiKey) return;
            if (apiKey.trim().length < 10) {
                toast.error('That doesn\'t look like a valid API key. Please try again.');
                return;
            }
            credentials = { apiKey: apiKey.trim() };
        }

        setIsConnecting(connector.id);
        const toastId = toast.loading(`Connecting to ${connector.name}...`);

        try {
            const result = await connectIntegration(connector.id, connector.name, shopDomain, credentials);
            if (result.success) {
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                    return;
                }
                if (result.live) {
                    toast.success(`${connector.name} connected successfully! 🎉 Live data sync is active.`, { id: toastId, duration: 5000 });
                } else {
                    const msg = result.simulated ? `Connected to ${connector.name} (Simulated)` : `Connected to ${connector.name}!`;
                    toast.success(msg, { id: toastId });
                }
            } else {
                toast.error(result.error || 'Failed to connect', { id: toastId, duration: 5000 });
            }
        } catch {
            toast.error('Failed to connect', { id: toastId });
        } finally {
            setIsConnecting(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectors.map((connector) => {
                const isConnected = activeIntegrationIds.has(connector.id) || (connector.id === 'shopify' && activeIntegrationIds.has('ecommerce-sync'));

                return (
                    <div
                        key={connector.id}
                        className={clsx(
                            "bg-white dark:bg-slate-900 border rounded-xl p-6 transition-all",
                            isConnected ? "border-emerald-200 dark:border-emerald-800 shadow-sm" : "border-slate-200 dark:border-slate-800 hover:shadow-md"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx("w-12 h-12 rounded-lg flex items-center justify-center", connector.color)}>
                                <connector.icon className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-2">
                                {connector.authType === 'api_key' && connector.status === 'available' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                                        Live API
                                    </span>
                                )}
                                <span className={clsx(
                                    "text-xs font-semibold px-2 py-1 rounded-full border",
                                    isConnected ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700" :
                                        connector.status === 'available' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" :
                                            connector.status === 'beta' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" :
                                                "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                )}>
                                    {isConnected ? 'Connected' : connector.status === 'available' ? 'Available' : connector.status === 'beta' ? 'Beta' : 'Planned'}
                                </span>
                            </div>
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{connector.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px]">
                            {connector.description}
                        </p>

                        <button
                            onClick={() => handleConnect(connector)}
                            disabled={connector.status === 'planned' || isConnecting === connector.id || isConnected}
                            className={clsx(
                                "w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                isConnected
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                    : connector.status === 'planned' || isConnecting === connector.id
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                                        : connector.id === 'katana'
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                            : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                            )}
                        >
                            {isConnected ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" /> Connected
                                </>
                            ) : connector.status === 'planned' ? (
                                <span>Coming Soon</span>
                            ) : isConnecting === connector.id ? (
                                <span>Connecting...</span>
                            ) : (
                                <>
                                    {connector.id === 'katana' ? 'Connect with API Key' : 'Connect'} <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
