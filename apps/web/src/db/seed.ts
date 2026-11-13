import { db } from '@/lib/db';

/**
 * Seeds demo data for a new user. Called on first login.
 */
export async function seedUserData(userId: string) {
    // Check if user already has data
    const existing = await db.query('SELECT COUNT(*)::int as count FROM integrations WHERE user_id = $1', [userId]);
    if (existing.rows[0].count > 0) return; // Already seeded

    // 1. Seed integrations
    await db.query(
        `INSERT INTO integrations (id, user_id, name, source, destination, status, last_run, uptime) VALUES
            ('ecommerce-sync', $1, 'E-Commerce Sync', 'shopify', 'netsuite', 'healthy', NOW() - INTERVAL '2 minutes', '99.9%'),
            ('plm-erp', $1, 'PLM to ERP', 'arena', 'sap', 'healthy', NOW() - INTERVAL '1 hour', '98.5%'),
            ('crm-updates', $1, 'CRM Updates', 'salesforce', 'slack', 'error', NOW() - INTERVAL '5 minutes', '95.2%'),
            ('bom-importer', $1, 'BOM Importer', 'file-upload', 'nexus', 'healthy', NOW(), '100%')`,
        [userId]
    );

    // 2. Seed activity logs (mix of success/failure over past 7 days)
    const events = [
        { event: 'order.created', integration: 'ecommerce-sync', status: 'success' },
        { event: 'order.updated', integration: 'ecommerce-sync', status: 'success' },
        { event: 'inventory.sync', integration: 'ecommerce-sync', status: 'success' },
        { event: 'bom.exported', integration: 'plm-erp', status: 'success' },
        { event: 'bom.revision', integration: 'plm-erp', status: 'success' },
        { event: 'part.updated', integration: 'plm-erp', status: 'success' },
        { event: 'contact.synced', integration: 'crm-updates', status: 'success' },
        { event: 'deal.closed', integration: 'crm-updates', status: 'success' },
        { event: 'lead.created', integration: 'crm-updates', status: 'failure' },
        { event: 'notification.failed', integration: 'crm-updates', status: 'failure' },
        { event: 'bom.validated', integration: 'bom-importer', status: 'success' },
        { event: 'bom.imported', integration: 'bom-importer', status: 'success' },
        { event: 'order.fulfilled', integration: 'ecommerce-sync', status: 'success' },
        { event: 'price.updated', integration: 'ecommerce-sync', status: 'failure' },
        { event: 'sync.completed', integration: 'plm-erp', status: 'success' },
    ];

    for (let i = 0; i < events.length; i++) {
        const e = events[i];
        const daysAgo = Math.floor(i / 3); // Spread over past ~5 days
        const duration = `${Math.floor(Math.random() * 400) + 80}ms`;
        const payload = JSON.stringify({
            source: e.integration,
            event: e.event,
            timestamp: new Date().toISOString(),
            data: { id: `item_${1000 + i}`, action: e.event.split('.')[1] }
        }, null, 2);

        await db.query(
            `INSERT INTO activity_logs (user_id, integration_id, event, status, duration, payload, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysAgo} days' - INTERVAL '${Math.floor(Math.random() * 12)} hours')`,
            [userId, e.integration, e.event, e.status, duration, payload]
        );
    }

    // 3. Seed settings
    const apiKey = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.query(
        `INSERT INTO organization_settings (user_id, api_key, email_alerts, slack_alerts, retention_days)
         VALUES ($1, $2, true, false, 30)`,
        [userId, apiKey]
    );

    // 4. Seed a sample BOM import
    await db.query(
        `INSERT INTO bom_imports (user_id, filename, total_rows, valid_rows, invalid_rows, warning_rows, data, created_at)
         VALUES ($1, 'sample-bom.csv', 25, 23, 1, 1, '[]'::jsonb, NOW() - INTERVAL '1 day')`,
        [userId]
    );
}

/**
 * Deletes all data for a user. Used by reset endpoints.
 */
export async function clearUserData(userId: string) {
    await db.query('DELETE FROM bom_imports WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM organization_settings WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM integrations WHERE user_id = $1', [userId]);
}
