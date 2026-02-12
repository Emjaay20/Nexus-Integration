
import { NextRequest, NextResponse } from 'next/server';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { event, source, payload } = body;

        // Validate inputs (basic)
        if (!event || !source) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: event, source' },
                { status: 400 }
            );
        }

        // Determine integration name based on source (mock logic)
        // Determine integration ID based on source
        let integration = 'unknown';
        if (source === 'shopify') integration = 'ecommerce-sync';
        else if (source === 'salesforce') integration = 'crm-updates';
        else if (source === 'arena') integration = 'plm-erp';
        else if (source === 'bom-importer') integration = 'bom-importer';
        else integration = source;

        // Create the log entry
        const log = await integrationService.addActivityLog({
            event: event,
            integration: integration,
            status: 'success', // For this playground we default to success unless specific error trigger
            duration: `${Math.floor(Math.random() * 500) + 100}ms`,
            payload: JSON.stringify(payload, null, 2),
            response: {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            }
        });

        // Trigger real-time update
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
