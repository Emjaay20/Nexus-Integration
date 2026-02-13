
import { IntegrationConfig, IntegrationLog } from '@/types/integration';
import { db } from '@/lib/db';

export const integrationService = {
    getIntegrations: async (userId: string): Promise<IntegrationConfig[]> => {
        try {
            const result = await db.query('SELECT * FROM integrations WHERE user_id = $1 ORDER BY last_run DESC', [userId]);
            return result.rows.map(row => ({
                ...row,
                lastRun: new Date(row.last_run).toLocaleString(),
                uptime: row.uptime || '0%'
            }));
        } catch (error) {
            console.error('Failed to fetch integrations:', error);
            return [];
        }
    },

    getActivityLogs: async (userId: string): Promise<IntegrationLog[]> => {
        try {
            const result = await db.query('SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
            return result.rows.map(row => ({
                id: row.id,
                integration: row.integration_id || 'Unknown',
                event: row.event,
                status: row.status as any,
                time: new Date(row.created_at).toLocaleString(),
                duration: row.duration,
                payload: row.payload,
                response: row.response ? JSON.parse(row.response) : undefined,
                error: row.error ? JSON.parse(row.error) : undefined
            }));
        } catch (error) {
            console.error('Failed to fetch activity logs:', error);
            return [];
        }
    },

    addActivityLog: async (userId: string, log: Omit<IntegrationLog, 'id' | 'time'>): Promise<IntegrationLog> => {
        try {
            const result = await db.query(
                `INSERT INTO activity_logs (user_id, event, integration_id, status, duration, payload, response, error) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING *`,
                [
                    userId,
                    log.event,
                    log.integration,
                    log.status,
                    log.duration,
                    log.payload,
                    log.response ? JSON.stringify(log.response) : null,
                    log.error ? JSON.stringify(log.error) : null
                ]
            );

            const newStatus = log.status === 'failure' ? 'error' : 'healthy';
            await db.query(
                `UPDATE integrations SET status = $1, last_run = NOW() WHERE id = $2 AND user_id = $3`,
                [newStatus, log.integration, userId]
            );

            const row = result.rows[0];
            return {
                id: row.id,
                event: row.event,
                integration: row.integration_id,
                status: row.status as any,
                time: 'Just now',
                duration: row.duration,
                payload: row.payload,
                response: row.response ? JSON.parse(row.response) : undefined
            };
        } catch (error) {
            console.error('Failed to add activity log:', error);
            throw error;
        }
    },

    getIntegrationById: async (userId: string, id: string): Promise<IntegrationConfig | undefined> => {
        try {
            const result = await db.query('SELECT * FROM integrations WHERE id = $1 AND user_id = $2', [id, userId]);
            if (result.rows.length === 0) return undefined;

            const row = result.rows[0];
            return {
                ...row,
                lastRun: new Date(row.last_run).toLocaleString(),
                uptime: row.uptime
            };
        } catch (error) {
            console.error('Error fetching integration by id:', error);
            return undefined;
        }
    },

    getLogById: async (userId: string, id: string): Promise<IntegrationLog | undefined> => {
        try {
            const result = await db.query('SELECT * FROM activity_logs WHERE id = $1 AND user_id = $2', [id, userId]);
            if (result.rows.length === 0) return undefined;

            const row = result.rows[0];
            return {
                id: row.id,
                integration: row.integration_id,
                event: row.event,
                status: row.status as any,
                time: new Date(row.created_at).toLocaleString(),
                duration: row.duration,
                payload: row.payload,
                response: row.response ? JSON.parse(row.response) : undefined,
                error: row.error ? JSON.parse(row.error) : undefined
            };
        } catch (error) {
            console.error('Error fetching log by id:', error);
            return undefined;
        }
    },

    getEventsPerDay: async (userId: string, days: number = 30): Promise<{ day: string; success: number; failure: number }[]> => {
        try {
            const result = await db.query(
                `SELECT DATE(created_at) as day, status, COUNT(*)::int as count
                 FROM activity_logs
                 WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
                 GROUP BY day, status
                 ORDER BY day`,
                [userId]
            );

            const dayMap = new Map<string, { success: number; failure: number }>();
            for (const row of result.rows) {
                const dayStr = new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!dayMap.has(dayStr)) dayMap.set(dayStr, { success: 0, failure: 0 });
                const entry = dayMap.get(dayStr)!;
                if (row.status === 'success') entry.success = row.count;
                else entry.failure = row.count;
            }

            return Array.from(dayMap.entries()).map(([day, counts]) => ({ day, ...counts }));
        } catch (error) {
            console.error('Error fetching events per day:', error);
            return [];
        }
    },

    getStatusBreakdown: async (userId: string): Promise<{ name: string; value: number; color: string }[]> => {
        try {
            const result = await db.query(
                `SELECT status, COUNT(*)::int as count FROM activity_logs WHERE user_id = $1 GROUP BY status`,
                [userId]
            );
            return result.rows.map(row => ({
                name: row.status === 'success' ? 'Success' : 'Failed',
                value: row.count,
                color: row.status === 'success' ? '#22c55e' : '#ef4444',
            }));
        } catch (error) {
            console.error('Error fetching status breakdown:', error);
            return [];
        }
    },

    getIntegrationHealth: async (userId: string): Promise<{ integration: string; success: number; failure: number; total: number }[]> => {
        try {
            const result = await db.query(
                `SELECT integration_id, status, COUNT(*)::int as count
                 FROM activity_logs
                 WHERE user_id = $1
                 GROUP BY integration_id, status`,
                [userId]
            );

            const intMap = new Map<string, { success: number; failure: number }>();
            for (const row of result.rows) {
                const id = row.integration_id || 'unknown';
                if (!intMap.has(id)) intMap.set(id, { success: 0, failure: 0 });
                const entry = intMap.get(id)!;
                if (row.status === 'success') entry.success = row.count;
                else entry.failure = row.count;
            }

            return Array.from(intMap.entries()).map(([integration, counts]) => ({
                integration,
                ...counts,
                total: counts.success + counts.failure,
            }));
        } catch (error) {
            console.error('Error fetching integration health:', error);
            return [];
        }
    },

    getRelatedLogs: async (userId: string, integrationId: string, excludeId: string, limit: number = 5): Promise<IntegrationLog[]> => {
        try {
            const result = await db.query(
                `SELECT * FROM activity_logs WHERE user_id = $1 AND integration_id = $2 AND id != $3 ORDER BY created_at DESC LIMIT $4`,
                [userId, integrationId, excludeId, limit]
            );
            return result.rows.map(row => ({
                id: row.id,
                integration: row.integration_id,
                event: row.event,
                status: row.status as any,
                time: new Date(row.created_at).toLocaleString(),
                duration: row.duration,
                payload: row.payload,
                response: row.response ? JSON.parse(row.response) : undefined,
                error: row.error ? JSON.parse(row.error) : undefined
            }));
        } catch (error) {
            console.error('Error fetching related logs:', error);
            return [];
        }
    },
};
