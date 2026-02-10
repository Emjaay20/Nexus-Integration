
import { IntegrationConfig, IntegrationLog } from '@/types/integration';
import { integrationConfigs } from '@/data/mock-integrations';
import { storage } from '@/lib/storage';

// In a real app, these would be async API calls
export const integrationService = {
    getIntegrations: async (): Promise<IntegrationConfig[]> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return integrationConfigs;
    },

    getActivityLogs: async (): Promise<IntegrationLog[]> => {
        // In a real app we might cache this, but for the "live" feel we fetch fresh
        await new Promise(resolve => setTimeout(resolve, 300));
        return storage.getLogs();
    },

    addActivityLog: async (log: Omit<IntegrationLog, 'id' | 'time'>): Promise<IntegrationLog> => {
        const newLog: IntegrationLog = {
            ...log,
            id: Date.now(),
            time: 'Just now',
            status: log.status || 'success'
        };

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        return storage.addLog(newLog);
    },

    getIntegrationById: async (id: string): Promise<IntegrationConfig | undefined> => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return integrationConfigs.find(c => c.id === id);
    },

    getLogById: async (id: string): Promise<IntegrationLog | undefined> => {
        await new Promise(resolve => setTimeout(resolve, 200));
        const logs = storage.getLogs();
        return logs.find(l => l.id.toString() === id);
    }
};
