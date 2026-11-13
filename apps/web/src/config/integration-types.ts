
import { ShoppingBag, Database, MessageSquare, Box, Globe, Archive, Factory } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type SystemType = 'ecommerce' | 'erp' | 'crm' | 'plm' | 'communication' | 'other';

export interface IntegrationSystem {
    id: string;
    name: string;
    type: SystemType;
    icon: any; // LucideIcon type is tricky to import directly sometimes, 'any' or specific React.FC is fine for config
    color: string;
}

export const SUPPORTED_SYSTEMS: Record<string, IntegrationSystem> = {
    shopify: {
        id: 'shopify',
        name: 'Shopify',
        type: 'ecommerce',
        icon: ShoppingBag,
        color: 'text-green-600 bg-green-50 border-green-200'
    },
    netsuite: {
        id: 'netsuite',
        name: 'NetSuite',
        type: 'erp',
        icon: Database,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    salesforce: {
        id: 'salesforce',
        name: 'Salesforce',
        type: 'crm',
        icon: Globe,
        color: 'text-sky-600 bg-sky-50 border-sky-200'
    },
    slack: {
        id: 'slack',
        name: 'Slack',
        type: 'communication',
        icon: MessageSquare,
        color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    arena: {
        id: 'arena',
        name: 'Arena PLM',
        type: 'plm',
        icon: Archive,
        color: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    sap: {
        id: 'sap',
        name: 'SAP S/4HANA',
        type: 'erp',
        icon: Box,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    katana: {
        id: 'katana',
        name: 'Katana MRP',
        type: 'erp',
        icon: Factory,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    }
};

export function getSystemConfig(id: string): IntegrationSystem {
    return SUPPORTED_SYSTEMS[id.toLowerCase()] || {
        id: 'unknown',
        name: id,
        type: 'other',
        icon: Box,
        color: 'text-slate-600 bg-slate-50 border-slate-200'
    };
}
