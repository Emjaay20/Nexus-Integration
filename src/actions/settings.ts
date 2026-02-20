'use server';

import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function getSettings() {
    try {
        const userId = await getCurrentUserId();
        const result = await db.query('SELECT * FROM organization_settings WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return null;
    }
}

export async function updateSettings(data: { email_alerts: boolean; slack_alerts: boolean; retention_days: number }) {
    try {
        const userId = await getCurrentUserId();
        const existing = await db.query('SELECT * FROM organization_settings WHERE user_id = $1', [userId]);
        if (existing.rows.length === 0) {
            await db.query(
                'INSERT INTO organization_settings (user_id, email_alerts, slack_alerts, retention_days) VALUES ($1, $2, $3, $4)',
                [userId, data.email_alerts, data.slack_alerts, data.retention_days]
            );
        } else {
            await db.query(
                'UPDATE organization_settings SET email_alerts = $1, slack_alerts = $2, retention_days = $3 WHERE user_id = $4',
                [data.email_alerts, data.slack_alerts, data.retention_days, userId]
            );
        }
        revalidatePath('/integration-hub/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}

export async function rotateApiKey() {
    try {
        const userId = await getCurrentUserId();
        const newKey = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const existing = await db.query('SELECT * FROM organization_settings WHERE user_id = $1', [userId]);
        if (existing.rows.length === 0) {
            await db.query(
                'INSERT INTO organization_settings (user_id, api_key, email_alerts, slack_alerts, retention_days) VALUES ($1, $2, false, false, 30)',
                [userId, newKey]
            );
        } else {
            await db.query('UPDATE organization_settings SET api_key = $1 WHERE user_id = $2', [newKey, userId]);
        }

        revalidatePath('/integration-hub/settings');
        return { success: true, apiKey: newKey };
    } catch (error) {
        console.error('Failed to rotate API key:', error);
        return { success: false, error: 'Failed to rotate API key' };
    }
}
