import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { shopifyService } from '@/services/shopifyService';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const connection = await shopifyService.getConnection(session.user.id);

        if (!connection) {
            return NextResponse.json({ 
                connected: false,
                shop: null,
            });
        }

        return NextResponse.json({
            connected: true,
            shop: connection.shop_domain,
            scope: connection.scope,
            installedAt: connection.installed_at,
        });

    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }
}
