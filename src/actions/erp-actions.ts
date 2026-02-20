'use server';

import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function configureErp(formData: FormData) {
    const userId = await getCurrentUserId();
    const integrationId = formData.get('integrationId') as string;
    const endpoint = formData.get('endpoint') as string;
    const authHeader = formData.get('authHeader') as string;

    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        // Simple validation: test connectivity
        try {
            const testRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader ? { 'Authorization': authHeader } : {})
                },
                body: JSON.stringify({ event: 'ping', timestamp: new Date().toISOString() })
            });
            // We accept any response for now as long as it reachable, 
            // but for "Test" success ideally it should be 2xx. 
            // Many webhooks return 200 OK.
            if (!testRes.ok && testRes.status !== 404 && testRes.status !== 405) {
                // If it's a 500 or connection refused, we might warn.
                // console.warn('ERP Test Endpoint returned:', testRes.status);
            }
        } catch (err) {
            console.error('ERP Connectivity Test Failed:', err);
            return { success: false, error: 'Could not reach endpoint' };
        }

        // Upsert configuration
        await db.query(
            `INSERT INTO erp_connections (user_id, name, api_endpoint, auth_header)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, name) 
             DO UPDATE SET api_endpoint = EXCLUDED.api_endpoint, auth_header = EXCLUDED.auth_header, created_at = NOW()`,
            [userId, integrationId === 'netsuite' ? 'NetSuite' : 'SAP S/4HANA', endpoint, authHeader]
            // Using ID map to name for simplicity, or we could pass name explicitly
        );

        revalidatePath('/integration-hub/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to configure ERP:', error);
        return { success: false, error: 'Database error' };
    }
}

export async function syncToErp(integrationId: string, payload: any) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        // 1. Get credentials
        const res = await db.query(
            'SELECT * FROM erp_connections WHERE user_id = $1 AND name = $2',
            [userId, integrationId === 'netsuite' ? 'NetSuite' : 'SAP S/4HANA']
        );

        if (res.rows.length === 0) {
            return { success: false, error: 'ERP not configured' };
        }

        const config = res.rows[0];

        // 2. Transform Payload (Mock transformation for now)
        const transformedData = {
            source: 'Nexus',
            event: 'order.created',
            timestamp: new Date().toISOString(),
            data: payload
        };

        // 3. Push to ERP
        const response = await fetch(config.api_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.auth_header ? { 'Authorization': config.auth_header } : {})
            },
            body: JSON.stringify(transformedData)
        });

        if (!response.ok) {
            throw new Error(`ERP responded with ${response.status}`);
        }

        return { success: true };

    } catch (error: any) {
        console.error('Sync to ERP failed:', error);
        return { success: false, error: error.message };
    }
}
