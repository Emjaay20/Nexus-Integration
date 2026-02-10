
import { IntegrationConfig, IntegrationLog } from '@/types/integration';
import { db } from '@/lib/db';

export const integrationService = {
    getIntegrations: async (): Promise<IntegrationConfig[]> => {
        try {
            const result = await db.query('SELECT * FROM integrations ORDER BY last_run DESC');

            // Map DB snake_case to frontend camelCase if needed, but our schema matches mostly
            // We need to map 'last_run' timestamp to string for now to match interface, or update interface
            return result.rows.map(row => ({
                ...row,
                lastRun: new Date(row.last_run).toLocaleString(), // Simple formatting
                uptime: row.uptime || '0%'
            }));
        } catch (error) {
            console.error('Failed to fetch integrations:', error);
            return [];
        }
    },

    getActivityLogs: async (): Promise<IntegrationLog[]> => {
        try {
            const result = await db.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50');
            return result.rows.map(row => ({
                id: row.id,
                integration: row.integration_id || 'Unknown', // This should probably be a join or name
                event: row.event,
                status: row.status as any,
                time: new Date(row.created_at).toLocaleString(), // value "Just now" replaced by real time
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

    addActivityLog: async (log: Omit<IntegrationLog, 'id' | 'time'>): Promise<IntegrationLog> => {
        try {
            // Start a transaction-like approach (or just sequential queries for now)

            // 1. Insert the log
            const result = await db.query(
                `INSERT INTO activity_logs (event, integration_id, status, duration, payload, response, error) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING *`,
                [
                    log.event,
                    log.integration,
                    log.status,
                    log.duration,
                    log.payload,
                    log.response ? JSON.stringify(log.response) : null,
                    log.error ? JSON.stringify(log.error) : null
                ]
            );

            // 2. Update the parent integration status and last_run
            // If log status is 'failure', set integration to 'error'. If 'success', set to 'healthy'.
            const newStatus = log.status === 'failure' ? 'error' : 'healthy';

            await db.query(
                `UPDATE integrations 
                 SET status = $1, last_run = NOW() 
                 WHERE id = $2`,
                [newStatus, log.integration]
            );

            const row = result.rows[0];
            return {
                id: row.id,
                event: row.event,
                integration: row.integration_id,
                status: row.status as any,
                time: 'Just now', // For immediate UI feedback
                duration: row.duration,
                payload: row.payload,
                response: row.response ? JSON.parse(row.response) : undefined
            };
        } catch (error) {
            console.error('Failed to add activity log:', error);
            throw error;
        }
    },

    getIntegrationById: async (id: string): Promise<IntegrationConfig | undefined> => {
        try {
            const result = await db.query('SELECT * FROM integrations WHERE id = $1', [id]);
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

    getLogById: async (id: string): Promise<IntegrationLog | undefined> => {
        try {
            const result = await db.query('SELECT * FROM activity_logs WHERE id = $1', [id]);
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
    }
};
