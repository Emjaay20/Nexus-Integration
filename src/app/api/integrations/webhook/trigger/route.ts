
import { NextRequest, NextResponse } from 'next/server';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }
        const userId = session.user.id;

        const body = await request.json();
        const { event, source, payload } = body;

        if (!event || !source) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: event, source' },
                { status: 400 }
            );
        }

        let integration = 'unknown';
        if (source === 'shopify') integration = 'ecommerce-sync';
        else if (source === 'salesforce') integration = 'crm-updates';
        else if (source === 'arena') integration = 'plm-erp';
        else if (source === 'bom-importer') integration = 'bom-importer';
        else integration = source;

        const log = await integrationService.addActivityLog(userId, {
            event: event,
            integration: integration,
            status: 'success',
            duration: `${Math.floor(Math.random() * 500) + 100}ms`,
            payload: JSON.stringify(payload, null, 2),
            response: {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            }
        });

        try {
            await pusherServer.trigger('integration-hub', 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher Error:', pusherError);
        }

        return NextResponse.json({
            success: true,
            data: log,
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
