
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

        const log = await integrationService.addActivityLog(userId, {
            event: event,
            integration: integration,
            status: logStatus,
            duration: `${Math.floor(Math.random() * 500) + 100}ms`,
            payload: JSON.stringify(payload, null, 2),
            response: logStatus === 'success' ? {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            } : undefined,
            error: logStatus === 'failure' ? {
                name: 'IntegrationError',
                message: `Failed to sync with ${source}: connection timeout`,
                code: 'ERR_TIMEOUT'
            } : undefined,
        });

        try {
            await pusherServer.trigger('integration-hub', 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher Error:', pusherError);
        }

        // Failure recovery lifecycle: failure → retrying → recovered
        if (logStatus === 'failure') {
            // Schedule retry after 1.5 seconds
            setTimeout(async () => {
                try {
                    const retryLog = await integrationService.addActivityLog(userId, {
                        event: `Retry: ${event}`,
                        integration: integration,
                        status: 'retrying',
                        duration: '...',
                        payload: JSON.stringify(payload, null, 2),
                    });
                    await pusherServer.trigger('integration-hub', 'new-activity', retryLog);

                    // Schedule recovery after another 1.5 seconds
                    setTimeout(async () => {
                        try {
                            const recoveredLog = await integrationService.addActivityLog(userId, {
                                event: `Recovered: ${event}`,
                                integration: integration,
                                status: 'recovered',
                                duration: `${Math.floor(Math.random() * 300) + 200}ms`,
                                payload: JSON.stringify(payload, null, 2),
                                response: {
                                    status: 200,
                                    statusText: 'OK',
                                    headers: { 'Content-Type': 'application/json' }
                                },
                            });
                            await pusherServer.trigger('integration-hub', 'new-activity', recoveredLog);
                        } catch (err) {
                            console.error('Recovery log error:', err);
                        }
                    }, 1500);
                } catch (err) {
                    console.error('Retry log error:', err);
                }
            }, 1500);
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
