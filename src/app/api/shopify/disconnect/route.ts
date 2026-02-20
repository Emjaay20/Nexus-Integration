import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { shopifyService } from '@/services/shopifyService';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function DELETE() {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the current connection
        const connection = await shopifyService.getConnection(session.user.id);
        
        if (!connection) {
            return NextResponse.json({ error: 'No Shopify connection found' }, { status: 404 });
        }

        // Delete the connection from our database
        await shopifyService.deleteConnection(session.user.id);

        // Log the disconnection
        const log = await integrationService.addActivityLog(session.user.id, {
            event: 'Shopify Disconnected',
            integration: 'ecommerce-sync',
            status: 'success',
            duration: '~',
            payload: JSON.stringify({ shop: connection.shop_domain }, null, 2),
        });

        // Push real-time update
        try {
            await pusherServer.trigger('integration-hub', 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher error:', pusherError);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Shopify disconnected successfully',
        });

    } catch (error) {
        console.error('Disconnect error:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }
}
