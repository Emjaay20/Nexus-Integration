import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { integrationService } from '@/services/integrationService';
import { shopifyService } from '@/services/shopifyService';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    let provider = searchParams.get('provider');
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    let state = searchParams.get('state');

    // Handle "userId:provider" state format
    if (state && state.includes(':')) {
        const parts = state.split(':');
        state = parts[0]; // The userId
        if (!provider) {
            provider = parts[1];
        }
    }

    // Handle Shopify OAuth callback
    if (provider === 'shopify') {
        return handleShopifyCallback(request, code, shop);
    }

    // Fallback for other providers (legacy behavior)
    if (!code || !state || !provider) {
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=missing_params', request.url));
    }

    const userId = state;

    try {
        await integrationService.createIntegration(userId, {
            id: provider,
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            source: provider,
            destination: 'Nexus',
            status: 'healthy',
        });

        return NextResponse.redirect(new URL('/integration-hub/connectors?success=connected', request.url));
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=oauth_failed', request.url));
    }
}

async function handleShopifyCallback(request: NextRequest, code: string | null, shop: string | null) {
    if (!code || !shop) {
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=missing_params', request.url));
    }

    // Get the current user
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    try {
        // Exchange the code for an access token
        const { access_token, scope } = await shopifyService.exchangeToken(shop, code);

        // Save the connection to the database
        await shopifyService.saveConnection(session.user.id, shop, access_token, scope);

        // Register webhooks with Shopify
        await shopifyService.registerWebhooks(shop, access_token);

        // Ensure the ecommerce-sync integration exists for this user
        await integrationService.createIntegration(session.user.id, {
            id: 'ecommerce-sync',
            name: 'E-Commerce Sync',
            source: 'shopify',
            destination: 'nexus',
            status: 'healthy',
        });

        // Log the successful connection
        const log = await integrationService.addActivityLog(session.user.id, {
            event: 'Shopify Connected',
            integration: 'ecommerce-sync',
            status: 'success',
            duration: '~',
            payload: JSON.stringify({ shop, scope }, null, 2),
        });

        // Push real-time update
        try {
            await pusherServer.trigger('integration-hub', 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher error:', pusherError);
        }

        // Redirect to the integration hub with success message
        return NextResponse.redirect(new URL('/integration-hub/connectors?shopify=connected', request.url));

    } catch (error) {
        console.error('Shopify OAuth error:', error);
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=oauth_failed', request.url));
    }
}
