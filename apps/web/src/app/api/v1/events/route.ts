import { NextRequest, NextResponse } from 'next/server';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const EventSchema = z.object({
    event: z.string().min(1, 'Event name is required'),
    source: z.string().min(1, 'Source is required'),
    payload: z.any().optional(),
    status: z.enum(['success', 'failure']).optional(),
});

async function resolveUserId(request: NextRequest): Promise<string | null> {
    const session = await auth();
    if (session?.user?.id) return session.user.id;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.slice(7);
        try {
            const crypto = await import('crypto');
            const hashed = crypto.createHash('sha256').update(apiKey).digest('hex');
            const result = await db.query(
                'SELECT user_id FROM organization_settings WHERE api_key = $1 OR api_key = $2',
                [apiKey, hashed]
            );
            if (result.rows.length > 0) return result.rows[0].user_id;
        } catch (error) {
            console.error('API key lookup error:', error);
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    const startTime = performance.now();

    try {
        const userId = await resolveUserId(request);
        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Provide a valid session cookie or Bearer API key.' },
                { status: 401 }
            );
        }

        const rawBody = await request.json();
        const parseResult = EventSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parseResult.error.flatten() },
                { status: 400 }
            );
        }

        const { event, source, payload, status: requestedStatus } = parseResult.data;

        let integration = 'unknown';
        if (source === 'shopify') integration = 'ecommerce-sync';
        else if (source === 'salesforce') integration = 'crm-updates';
        else if (source === 'arena') integration = 'plm-erp';
        else if (source === 'bom-importer') integration = 'bom-importer';
        else integration = source;

        const logStatus = requestedStatus === 'failure' ? 'failure' : 'success';
        const elapsedMs = Math.max(1, Math.round(performance.now() - startTime));

        // 1. Log the event with real measured duration
        const log = await integrationService.addActivityLog(userId, {
            event: event,
            integration: integration,
            status: logStatus,
            duration: `${elapsedMs}ms`,
            payload: JSON.stringify(payload ?? {}, null, 2),
            response: logStatus === 'success' ? {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json', 'X-Request-ID': crypto.randomUUID() },
            } : undefined,
            error: logStatus === 'failure' ? {
                name: 'IntegrationError',
                message: `Failed to sync with ${source}`,
                code: 'ERR_TIMEOUT',
            } : undefined,
        });

        // 2. Trigger real-time UI update on private channel
        const userChannel = `private-user-${userId}`;
        try {
            await pusherServer.trigger(userChannel, 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher Error on private channel:', pusherError);
        }

        return NextResponse.json({
            success: true,
            logId: log.id,
            duration: `${elapsedMs}ms`,
            channel: userChannel,
        });
    } catch (error) {
        console.error('Failed to trigger event:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
