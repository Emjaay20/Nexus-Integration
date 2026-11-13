'use server';

import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function getSettings() {
    try {
        const userId = await getCurrentUserId();
        const result = await db.query('SELECT * FROM organization_settings WHERE user_id = $1', [userId]);
        const settings = result.rows[0];
        if (!settings) return null;

        // Mask stored API key hash
        const maskedKey = settings.api_key
            ? `sk_live_••••••••${settings.api_key.substring(settings.api_key.length - 6)}`
            : null;

        return {
            ...settings,
            api_key: maskedKey,
            has_api_key: !!settings.api_key,
        };
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
        // Generate cryptographically secure 256-bit API key
        const randomSecret = crypto.randomBytes(32).toString('hex');
        const plaintextApiKey = `sk_live_${randomSecret}`;

        // Store SHA-256 hash at rest to protect against database leaks
        const hashedKey = crypto.createHash('sha256').update(plaintextApiKey).digest('hex');

        const existing = await db.query('SELECT * FROM organization_settings WHERE user_id = $1', [userId]);
        if (existing.rows.length === 0) {
            await db.query(
                'INSERT INTO organization_settings (user_id, api_key, email_alerts, slack_alerts, retention_days) VALUES ($1, $2, false, false, 30)',
                [userId, hashedKey]
            );
        } else {
            await db.query('UPDATE organization_settings SET api_key = $1 WHERE user_id = $2', [hashedKey, userId]);
        }

        revalidatePath('/integration-hub/settings');
        // Plaintext key returned only once upon generation
        return { success: true, apiKey: plaintextApiKey, isNew: true };
    } catch (error) {
        console.error('Failed to rotate API key:', error);
        return { success: false, error: 'Failed to rotate API key' };
    }
}
