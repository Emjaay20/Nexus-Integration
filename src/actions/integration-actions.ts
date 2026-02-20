'use server';

import { revalidatePath } from 'next/cache';
import { integrationService } from '@/services/integrationService';
import { getCurrentUserId } from '@/lib/session';

export async function triggerSync(integrationId: string) {
    const userId = await getCurrentUserId();

    // 1. Log "Sync Started"
    await integrationService.addActivityLog(userId, {
        integration: integrationId,
        event: 'manual.sync.started',
        status: 'retrying', // effectively "in progress"
        duration: '0ms',
        payload: JSON.stringify({ source: 'user-action' })
    });

    revalidatePath('/integration-hub');

    // 2. Simulate processing delay (1-3 seconds)
    const delay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 3. Random success or failure (80% success)
    const isSuccess = Math.random() > 0.2;
    const duration = `${delay}ms`;

    if (isSuccess) {
        await integrationService.addActivityLog(userId, {
            integration: integrationId,
            event: 'manual.sync.completed',
            status: 'success',
            duration: duration,
            response: { status: 200, statusText: 'OK', headers: {} }
        });
    } else {
        await integrationService.addActivityLog(userId, {
            integration: integrationId,
            event: 'manual.sync.failed',
            status: 'failure',
            duration: duration,
            error: { name: 'SyncError', message: 'Remote connection timed out', code: 'ECONNRESET' }
        });
    }

    revalidatePath('/integration-hub');
    return { success: isSuccess };
}
