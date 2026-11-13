
import fs from 'fs';
import path from 'path';
import { IntegrationLog } from '@/types/integration';
import { mockLogs } from '@/data/mock-integrations';

// Use a temporary file for storage to persist across dev server reloads
// In a real app, this would be a database connection
const TMP_DIR = path.join(process.cwd(), '.gemini', 'tmp');
const DB_FILE = path.join(TMP_DIR, 'integration_logs.json');

// Ensure directory exists
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

export const storage = {
    getLogs: (): IntegrationLog[] => {
        try {
            if (!fs.existsSync(DB_FILE)) {
                // Initialize with default mock data
                fs.writeFileSync(DB_FILE, JSON.stringify(mockLogs, null, 2));
                return mockLogs;
            }
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading logs:', error);
            return mockLogs;
        }
    },

    addLog: (log: IntegrationLog): IntegrationLog => {
        try {
            const logs = storage.getLogs();
            const newLogs = [log, ...logs].slice(0, 50); // Keep last 50 logs
            fs.writeFileSync(DB_FILE, JSON.stringify(newLogs, null, 2));
            return log;
        } catch (error) {
            console.error('Error writing log:', error);
            return log;
        }
    }
};
