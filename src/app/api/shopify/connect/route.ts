import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { shopifyService } from '@/services/shopifyService';

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

        // Generate state for CSRF protection
        const state = shopifyService.generateState();

        // Generate the OAuth URL
        const authUrl = shopifyService.getAuthUrl(shopDomain, state);

        return NextResponse.json({ 
            success: true, 
            authUrl,
            shop: shopDomain,
        });

    } catch (error) {
        console.error('Connect error:', error);
        return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
    }
}
