import { IntegrationConfig, IntegrationLog } from '@/types/integration';

export const integrationConfigs: IntegrationConfig[] = [
    {
        id: 'ecommerce-sync',
        name: 'E-Commerce Sync',
        source: 'shopify',
        destination: 'netsuite',
        status: 'healthy',
        lastRun: '2 mins ago',
        uptime: '99.9%'
    },
    {
        id: 'plm-erp',
        name: 'PLM to ERP',
        source: 'arena',
        destination: 'sap',
        status: 'healthy',
        lastRun: '1 hour ago',
        uptime: '98.5%'
    },
    {
        id: 'crm-updates',
        name: 'CRM Updates',
        source: 'salesforce',
        destination: 'slack',
        status: 'error',
        lastRun: 'failed 5 mins ago',
        uptime: '95.2%'
    }
];

export const mockLogs: IntegrationLog[] = [
    {
        id: 1,
        event: 'Order Created',
        integration: 'Shopify -> NetSuite',
        time: 'Just now',
        status: 'success',
        duration: '1.2s',
        payload: '{\n  "order_id": "1001",\n  "total": 120.00,\n  "currency": "USD"\n}',
        response: { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } }
    },
    { id: 2, event: 'Inventory Update', integration: 'NetSuite -> Shopify', time: '2m ago', status: 'success', duration: '450ms' },
    {
        id: 3,
        event: 'Customer Sync',
        integration: 'Salesforce -> Slack',
        time: '5m ago',
        status: 'failure',
        duration: '420ms',
        error: {
            name: 'Invalid Webhook Signature',
            message: "The signature provided in 'X-Slack-Signature' does not match the expected value.",
            code: 'AUTH_ERROR'
        },
        payload: '{\n  "event": "customer.created",\n  "customer": {\n    "id": "ct_99210",\n    "email": "sarah.connor@example.com"\n  }\n}',
        response: {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'req_9920112' }
        }
    },
    { id: 4, event: 'Product Import', integration: 'Arena -> SAP', time: '12m ago', status: 'success', duration: '2.3s' },
    { id: 5, event: 'Order Fulfilled', integration: 'Shopify -> NetSuite', time: '15m ago', status: 'success', duration: '800ms' },
];
