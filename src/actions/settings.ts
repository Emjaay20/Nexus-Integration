'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getSettings() {
    try {
        const result = await db.query('SELECT * FROM organization_settings WHERE id = 1');
        return result.rows[0];
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return null;
    }
}

export async function updateSettings(data: { email_alerts: boolean; slack_alerts: boolean; retention_days: number }) {
    try {
        await db.query(
            'UPDATE organization_settings SET email_alerts = $1, slack_alerts = $2, retention_days = $3 WHERE id = 1',
            [data.email_alerts, data.slack_alerts, data.retention_days]
        );
        revalidatePath('/integration-hub/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}

export async function rotateApiKey() {
    try {
        const newKey = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await db.query('UPDATE organization_settings SET api_key = $1 WHERE id = 1', [newKey]);
        revalidatePath('/integration-hub/settings');
        return { success: true, apiKey: newKey };
    } catch (error) {
        console.error('Failed to rotate API key:', error);
        return { success: false, error: 'Failed to rotate API key' };
    }
}
