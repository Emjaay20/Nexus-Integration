'use server';

import { integrationService } from '@/services/integrationService';
import { katanaService } from '@/services/katanaService';
import { getCurrentUserId } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function connectIntegration(connectorId: string, name: string, shopDomain?: string, credentials?: { apiKey?: string }) {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('Unauthorized');
    }

    try {
        // Real OAuth Flow Check
        // If we have credentials, we return a redirect URL to start the OAuth dance.
        if (connectorId === 'shopify' && process.env.SHOPIFY_CLIENT_ID) {
            const scopes = 'read_products,read_orders,read_inventory';
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000';

            // CLEANER APPROACH: Remove query params from redirect_uri to satisfy strict whitelisting
            const redirectUri = `${baseUrl}/api/integrations/auth/callback`;

            // Pass provider info in 'state' instead
            const state = `${userId}:shopify`;

            // Priority: User Input > Env Var > Default
            const targetShop = shopDomain || process.env.SHOPIFY_SHOP_NAME;

            if (!targetShop) {
                // Without a shop, we can't redirect to the right admin panel
                // We should probably error here or fallback to simulation if forcing it.
                // But for production flow, returning error is better.
                return { success: false, error: 'Shop domain required' };
            }

            // Ensure clean domain
            const cleanShop = targetShop.replace('https://', '').replace('http://', '').replace('/', '');

            const url = `https://${cleanShop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
            return { success: true, redirectUrl: url };
        }

        if (connectorId === 'salesforce' && process.env.SALESFORCE_CLIENT_ID) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000';
            const redirectUri = `${baseUrl}/api/integrations/auth/callback?provider=salesforce`;
            const url = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${process.env.SALESFORCE_CLIENT_ID}&redirect_uri=${redirectUri}&state=${userId}`;
            return { success: true, redirectUrl: url };
        }

        // --- KATANA MRP: Live API Key Integration ---
        if (connectorId === 'katana') {
            const apiKey = credentials?.apiKey || process.env.KATANA_API_KEY;

            if (!apiKey) {
                return { success: false, error: 'Katana API Key is required. You can get one from Katana Settings > API.' };
            }

            // Validate the API key against the real Katana API
            const validation = await katanaService.validateApiKey(apiKey);

            if (!validation.valid) {
                return { success: false, error: validation.error || 'Invalid API Key' };
            }

            // Key is valid — save the integration with credentials
            await integrationService.createIntegration(userId, {
                id: connectorId,
                name: name,
                source: connectorId,
                destination: 'Nexus',
                status: 'healthy',
            }, { apiKey });

            revalidatePath('/integration-hub');
            revalidatePath('/integration-hub/connectors');
            return { success: true, live: true };
        }

        // Fallback: Simulate connection if no credentials (or for non-oauth connectors)
        // This ensures the "Live MVP" works even without user providing API keys yet.
        await integrationService.createIntegration(userId, {
            id: connectorId,
            name: name,
            source: connectorId,
            destination: 'Nexus',
            status: 'healthy',
        });

        revalidatePath('/integration-hub');
        revalidatePath('/integration-hub/connectors');
        return { success: true, simulated: true };
    } catch (error) {
        console.error('Failed to connect integration:', error);
        return { success: false, error: 'Failed to connect integration' };
    }
}
