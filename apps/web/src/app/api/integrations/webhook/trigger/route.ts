import { NextRequest, NextResponse } from 'next/server';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';

const WebhookSchema = z.object({
    event: z.string().min(1, 'Event name is required'),
    source: z.string().min(1, 'Source is required'),
    payload: z.any().optional(),
    status: z.enum(['success', 'failure']).optional(),
    idempotencyKey: z.string().optional(),
});

async function resolveUserId(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const apiKey = authHeader.substring(7);
        try {
            // Check both raw and hashed keys for backward compatibility
            const crypto = await import('crypto');
            const hashed = crypto.createHash('sha256').update(apiKey).digest('hex');
            const res = await db.query(
                'SELECT user_id FROM organization_settings WHERE api_key = $1 OR api_key = $2',
                [apiKey, hashed]
            );
            if (res.rows.length > 0) {
                return res.rows[0].user_id;
            }
        } catch (error) {
            console.error('API Key lookup error:', error);
        }
    }

    const session = await auth();
    if (session?.user?.id) {
        return session.user.id;
    }

    return null;
}

export async function POST(request: NextRequest) {
    const requestStartTime = performance.now();

    try {
        const userId = await resolveUserId(request);
        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Provide a valid session cookie or Bearer API key.' },
                { status: 401 }
            );
        }

        const rawBody = await request.json();
        const parseResult = WebhookSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parseResult.error.flatten() },
                { status: 400 }
            );
        }

        const { event, source, payload, status: requestedStatus, idempotencyKey } = parseResult.data;

        let integration = 'unknown';
        if (source === 'shopify') integration = 'ecommerce-sync';
        else if (source === 'salesforce') integration = 'crm-updates';
        else if (source === 'arena') integration = 'plm-erp';
        else if (source === 'bom-importer') integration = 'bom-importer';
        else integration = source;

        const logStatus = requestedStatus === 'failure' ? 'failure' : 'success';
        const finalIdempotencyKey = idempotencyKey || `${source}-${event}-${Date.now()}`;

        // Return a 202 Accepted immediately
        const response = NextResponse.json({
            success: true,
            message: 'Webhook accepted and added to queue',
            idempotencyKey: finalIdempotencyKey,
        }, { status: 202 });

        // Process in background worker flow
        setTimeout(async () => {
            const workerStart = performance.now();
            try {
                console.log(`[Queue Worker] Processing webhook for ${source} (Key: ${finalIdempotencyKey})`);

                // Measure real execution duration
                const elapsedMs = Math.max(1, Math.round(performance.now() - workerStart + (workerStart - requestStartTime)));

                const log = await integrationService.addActivityLog(userId, {
                    event: event,
                    integration: integration,
                    status: logStatus,
                    duration: `${elapsedMs}ms`,
                    payload: JSON.stringify(payload ?? {}, null, 2),
                    idempotencyKey: finalIdempotencyKey,
                    response: logStatus === 'success' ? {
                        status: 200,
                        statusText: 'OK',
                        headers: { 'Content-Type': 'application/json' },
                    } : undefined,
                    error: logStatus === 'failure' ? {
                        name: 'IntegrationError',
                        message: `Failed to sync with ${source}: connection timeout`,
                        code: 'ERR_TIMEOUT',
                    } : undefined,
                });

                // Secure per-user private channel
                const userChannel = `private-user-${userId}`;
                try {
                    await pusherServer.trigger(userChannel, 'new-activity', log);
                } catch (pusherError) {
                    console.error('Pusher Error on private channel:', pusherError);
                }

                // Failure recovery lifecycle
                if (logStatus === 'failure') {
                    setTimeout(async () => {
                        const retryStart = performance.now();
                        try {
                            const retryLog = await integrationService.addActivityLog(userId, {
                                event: `Retry: ${event}`,
                                integration: integration,
                                status: 'retrying',
                                duration: '...',
                                payload: JSON.stringify(payload ?? {}, null, 2),
                            });
                            await pusherServer.trigger(userChannel, 'new-activity', retryLog);

                            setTimeout(async () => {
                                const recElapsed = Math.max(1, Math.round(performance.now() - retryStart));
                                try {
                                    const recoveredLog = await integrationService.addActivityLog(userId, {
                                        event: `Recovered: ${event}`,
                                        integration: integration,
                                        status: 'recovered',
                                        duration: `${recElapsed}ms`,
                                        payload: JSON.stringify(payload ?? {}, null, 2),
                                        response: {
                                            status: 200,
                                            statusText: 'OK',
                                            headers: { 'Content-Type': 'application/json' },
                                        },
                                    });
                                    await pusherServer.trigger(userChannel, 'new-activity', recoveredLog);
                                } catch (err) {
                                    console.error('Recovery log error:', err);
                                }
                            }, 1200);
                        } catch (err) {
                            console.error('Retry log error:', err);
                        }
                    }, 1000);
                }
            } catch (err: unknown) {
                const errorObj = err as { message?: string };
                if (errorObj.message?.includes('duplicate key value violates unique constraint')) {
                    console.log(`[Queue Worker] Skipped duplicate webhook (Key: ${finalIdempotencyKey})`);
                } else {
                    console.error('[Queue Worker] Error processing webhook:', err);
                }
            }
        }, 10);

        return response;
    } catch (error) {
        console.error('Webhook Trigger Error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
