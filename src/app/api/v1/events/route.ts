import { NextRequest, NextResponse } from 'next/server';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function resolveUserId(request: NextRequest): Promise<string | null> {
    // Method 1: Session auth (browser / playground)
    const session = await auth();
    if (session?.user?.id) return session.user.id;

    // Method 2: API key auth (external systems)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.slice(7);
        try {
            const result = await db.query(
                'SELECT user_id FROM organization_settings WHERE api_key = $1',
                [apiKey]
            );
            if (result.rows.length > 0) return result.rows[0].user_id;
        } catch (error) {
            console.error('API key lookup error:', error);
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await resolveUserId(request);
        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Provide a valid session cookie or Bearer API key.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { event, source, payload, status: requestedStatus } = body;

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

        const logStatus = requestedStatus === 'failure' ? 'failure' : 'success';

        // 1. Log the event
        const log = await integrationService.addActivityLog(userId, {
            event: event,
            integration: integration,
            status: logStatus,
            duration: `${Math.floor(Math.random() * 500) + 100}ms`,
            payload: JSON.stringify(payload, null, 2),
            response: logStatus === 'success' ? {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json', 'X-Request-ID': crypto.randomUUID() }
            } : undefined,
            error: logStatus === 'failure' ? {
                name: 'IntegrationError',
                message: `Failed to sync with ${source}`,
                code: 'ERR_TIMEOUT'
            } : undefined,
        });

        // 2. Trigger real-time UI update
        try {
            await pusherServer.trigger('integration-hub', 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher Error:', pusherError);
        }

        // 3. Simulate Lifecycle (if failure)
        if (logStatus === 'failure') {
            setTimeout(async () => {
                await integrationService.addActivityLog(userId, {
                    event: `Retry: ${event}`,
                    integration: integration,
                    status: 'retrying',
                    duration: '...',
                    payload: JSON.stringify(payload, null, 2),
                }).then(l => pusherServer.trigger('integration-hub', 'new-activity', l));

                setTimeout(async () => {
                    await integrationService.addActivityLog(userId, {
                        event: `Recovered: ${event}`,
                        integration: integration,
                        status: 'recovered',
                        duration: '200ms',
                        payload: JSON.stringify(payload, null, 2),
                    }).then(l => pusherServer.trigger('integration-hub', 'new-activity', l));
                }, 1500);
            }, 1000);
        }

        return NextResponse.json({
            success: true,
            eventId: log.id,
            timestamp: new Date().toISOString(),
            message: 'Event accepted'
        });

    } catch (error) {
        console.error('API Event Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
