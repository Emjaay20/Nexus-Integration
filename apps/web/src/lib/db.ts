import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon serverless driver
neonConfig.webSocketConstructor = ws;

// Lazy pool initialization to avoid build-time crash when DATABASE_URL is not set
let _pool: Pool | null = null;

function getPool(): Pool {
    if (!_pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined');
        }
        _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }
    return _pool;
}

export const pool = new Proxy({} as Pool, {
    get(_target, prop) {
        return (getPool() as any)[prop];
    },
});

// Helper for single queries
export const db = {
    query: (text: string, params?: any[]) => getPool().query(text, params),
};
