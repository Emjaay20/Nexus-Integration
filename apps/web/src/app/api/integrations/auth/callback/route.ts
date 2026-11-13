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
    const incomingState = searchParams.get('state');

    // Secure OAuth State (CSRF) verification
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!incomingState || !storedState || incomingState !== storedState) {
        console.error('OAuth Security Alert: CSRF state mismatch or missing state cookie.');
        return NextResponse.redirect(
            new URL('/integration-hub/connectors?error=csrf_state_mismatch', request.url)
        );
    }

    // Handle Shopify OAuth callback
    if (provider === 'shopify' || shop) {
        return handleShopifyCallback(request, code, shop);
    }

    // Fallback for other providers
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId || !code || !provider) {
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=missing_params', request.url));
    }

    try {
        await integrationService.createIntegration(userId, {
            id: provider,
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            source: provider,
            destination: 'Nexus',
            status: 'healthy',
        });

        const response = NextResponse.redirect(new URL('/integration-hub/connectors?success=connected', request.url));
        response.cookies.delete('oauth_state');
        return response;
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=oauth_failed', request.url));
    }
}

async function handleShopifyCallback(request: NextRequest, code: string | null, shop: string | null) {
    if (!code || !shop) {
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=missing_code_or_shop', request.url));
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    const userId = session.user.id;

    try {
        // Exchange code for access token
        const tokenResponse = await shopifyService.exchangeToken(shop, code);
        const { access_token, scope } = tokenResponse;

        // Save connection to database
        await shopifyService.saveConnection(userId, shop, access_token, scope);

        // Register default webhooks
        try {
            await shopifyService.registerWebhooks(shop, access_token);
        } catch (webhookError) {
            console.warn('Webhook registration warning (non-fatal):', webhookError);
        }

        // Log the integration connection event
        const log = await integrationService.addActivityLog(userId, {
            event: 'Shopify Connected',
            integration: 'ecommerce-sync',
            status: 'success',
            duration: '42ms',
            payload: JSON.stringify({ shop, scope }, null, 2),
        });

        // Push real-time update on secure user private channel
        try {
            await pusherServer.trigger(`private-user-${userId}`, 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher error:', pusherError);
        }

        const response = NextResponse.redirect(new URL('/integration-hub/connectors?shopify=connected', request.url));
        response.cookies.delete('oauth_state');
        return response;

    } catch (error) {
        console.error('Shopify OAuth error:', error);
        return NextResponse.redirect(new URL('/integration-hub/connectors?error=oauth_failed', request.url));
    }
}
