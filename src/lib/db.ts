import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon serverless driver
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper for single queries
export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
};
