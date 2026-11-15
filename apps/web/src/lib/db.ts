import { Pool as PgPool } from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

type AnyPool = PgPool | NeonPool;

let _pool: AnyPool | null = null;
let schemaPromise: Promise<void> | null = null;

const BOOTSTRAP_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    provider VARCHAR(50) DEFAULT 'credentials',
    password_hash TEXT,
    role VARCHAR(50) DEFAULT 'design_engineer',
    tenant_id VARCHAR(100) DEFAULT 'acme-oem',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'design_engineer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'acme-oem';

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(50) DEFAULT 'enterprise',
    nda_signed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
    org_id VARCHAR(100) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'design_engineer',
    clearance VARCHAR(50) NOT NULL DEFAULT 'confidential',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS integrations (
    id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    destination VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    last_run TIMESTAMP WITH TIME ZONE,
    uptime VARCHAR(10) DEFAULT '100%',
    credentials JSONB,
    PRIMARY KEY (id, user_id)
);

ALTER TABLE integrations ADD COLUMN IF NOT EXISTS credentials JSONB;

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id VARCHAR(50),
    event VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    duration VARCHAR(20),
    payload TEXT,
    response TEXT,
    error TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_idempotency_key_key ON activity_logs(idempotency_key);

CREATE TABLE IF NOT EXISTS organization_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    email_alerts BOOLEAN DEFAULT true,
    slack_alerts BOOLEAN DEFAULT false,
    retention_days INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS bom_imports (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER NOT NULL,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    warning_rows INTEGER NOT NULL DEFAULT 0,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopify_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_domain VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    scope TEXT,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, shop_domain)
);

CREATE TABLE IF NOT EXISTS erp_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    api_endpoint TEXT NOT NULL,
    auth_header TEXT,
    mapping_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);
`;

function getPool(): AnyPool {
    if (!_pool) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not defined');
        }
        if (url.includes('.neon.tech')) {
            _pool = new NeonPool({ connectionString: url });
        } else {
            _pool = new PgPool({ connectionString: url, max: 10 });
        }
    }
    return _pool;
}

async function ensureSchema() {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            try { await (getPool() as any).query(BOOTSTRAP_SCHEMA_SQL); }
            catch (error) { schemaPromise = null; throw error; }
        })();
    }
    await schemaPromise;
}

export const pool = new Proxy({} as PgPool, {
    get(_target, prop) {
        return (getPool() as any)[prop];
    },
});

export const db = {
    transaction: async <T>(work: (client: Pick<PgPool, 'query'>) => Promise<T>): Promise<T> => {
        await ensureSchema();
        const client = await (getPool() as PgPool).connect();
        try { await client.query('BEGIN'); const result = await work(client as unknown as Pick<PgPool, 'query'>); await client.query('COMMIT'); return result; }
        catch(error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
    },
    query: async (text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number | null }> => {
        await ensureSchema();
        return (getPool() as any).query(text, params);
    },
};
