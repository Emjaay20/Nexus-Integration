import { db } from '@/lib/db';
import crypto from 'crypto';

const SHOPIFY_API_VERSION = '2026-01';

export interface ShopifyConnection {
    id: number;
    user_id: string;
    shop_domain: string;
    access_token: string;
    scope: string;
    installed_at: Date;
}

export const shopifyService = {
    /**
     * Generate the OAuth authorization URL for a Shopify store
     */
    getAuthUrl: (shop: string, state: string): string => {
        const clientId = process.env.SHOPIFY_CLIENT_ID;
        const scopes = process.env.SHOPIFY_SCOPES || 'read_orders,read_products';
        const redirectUri = `${process.env.APP_URL}/api/integrations/auth/callback?provider=shopify`;

        const params = new URLSearchParams({
            client_id: clientId!,
            scope: scopes,
            redirect_uri: redirectUri,
            state: state,
        });

        return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
    },

    /**
     * Exchange the authorization code for an access token
     */
    exchangeToken: async (shop: string, code: string): Promise<{ access_token: string; scope: string }> => {
        const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                code: code,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to exchange token: ${error}`);
        }

        return response.json();
    },

    /**
     * Verify Shopify webhook HMAC signature
     */
    verifyWebhook: (body: string, hmacHeader: string): boolean => {
        const secret = process.env.SHOPIFY_CLIENT_SECRET!;
        const hash = crypto
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('base64');
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
    },

    /**
     * Register webhooks with Shopify store
     */
    registerWebhooks: async (shop: string, accessToken: string): Promise<void> => {
        const webhookUrl = `${process.env.APP_URL}/api/shopify/webhook`;
        
        const topics = [
            'orders/create',
            'orders/updated',
            'orders/fulfilled',
            'products/create',
            'products/update',
        ];

        for (const topic of topics) {
            try {
                const response = await fetch(
                    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shopify-Access-Token': accessToken,
                        },
                        body: JSON.stringify({
                            webhook: {
                                topic: topic,
                                address: webhookUrl,
                                format: 'json',
                            },
                        }),
                    }
                );

                if (!response.ok) {
                    const error = await response.text();
                    console.error(`Failed to register webhook ${topic}:`, error);
                } else {
                    console.log(`Registered webhook: ${topic}`);
                }
            } catch (error) {
                console.error(`Error registering webhook ${topic}:`, error);
            }
        }
    },

    /**
     * Make an authenticated API call to Shopify
     */
    apiCall: async <T>(shop: string, accessToken: string, endpoint: string, method = 'GET', body?: object): Promise<T> => {
        const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Shopify API error: ${error}`);
        }

        return response.json();
    },

    /**
     * Save a Shopify connection to the database
     */
    saveConnection: async (userId: string, shop: string, accessToken: string, scope: string): Promise<ShopifyConnection> => {
        const result = await db.query(
            `INSERT INTO shopify_connections (user_id, shop_domain, access_token, scope)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, shop_domain) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                scope = EXCLUDED.scope,
                installed_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, shop, accessToken, scope]
        );
        return result.rows[0];
    },

    /**
     * Get a user's Shopify connection
     */
    getConnection: async (userId: string): Promise<ShopifyConnection | null> => {
        const result = await db.query(
            'SELECT * FROM shopify_connections WHERE user_id = $1 LIMIT 1',
            [userId]
        );
        return result.rows[0] || null;
    },

    /**
     * Get connection by shop domain (for webhook processing)
     */
    getConnectionByShop: async (shop: string): Promise<ShopifyConnection | null> => {
        const result = await db.query(
            'SELECT * FROM shopify_connections WHERE shop_domain = $1 LIMIT 1',
            [shop]
        );
        return result.rows[0] || null;
    },

    /**
     * Remove a Shopify connection
     */
    deleteConnection: async (userId: string): Promise<void> => {
        await db.query('DELETE FROM shopify_connections WHERE user_id = $1', [userId]);
    },

    /**
     * Generate a random state for OAuth CSRF protection
     */
    generateState: (): string => {
        return crypto.randomBytes(16).toString('hex');
    },
};
