import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { shopifyService } from '@/services/shopifyService';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { shop } = body;

        if (!shop) {
            return NextResponse.json({ error: 'Shop domain is required' }, { status: 400 });
        }

        // Normalize the shop domain
        let shopDomain = shop.trim().toLowerCase();
        
        // Add .myshopify.com if not present
        if (!shopDomain.includes('.myshopify.com')) {
            shopDomain = `${shopDomain}.myshopify.com`;
        }

        // Remove https:// if present
        shopDomain = shopDomain.replace(/^https?:\/\//, '');

        // Generate cryptographically secure state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Generate the OAuth URL with this state
        const authUrl = shopifyService.getAuthUrl(shopDomain, state);

        const response = NextResponse.json({ 
            success: true, 
            authUrl,
            shop: shopDomain,
        });

        // Store state in signed/HTTP-only cookie for CSRF validation on callback
        response.cookies.set('oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10 minutes
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Connect error:', error);
        return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
    }
}
