/**
 * Migration script to add multi-tenant support.
 * Run: node scripts/migrate-multi-tenant.js
 * 
 * WARNING: This drops existing tables and recreates them.
 * For production use, write proper ALTER TABLE migrations.
 */
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    console.log('Starting multi-tenant migration...');

    try {
        // Drop existing tables (order matters for FKs)
        console.log('Dropping existing tables...');
        await pool.query('DROP TABLE IF EXISTS bom_imports CASCADE');
        await pool.query('DROP TABLE IF EXISTS activity_logs CASCADE');
        await pool.query('DROP TABLE IF EXISTS organization_settings CASCADE');
        await pool.query('DROP TABLE IF EXISTS integrations CASCADE');
        await pool.query('DROP TABLE IF EXISTS users CASCADE');

        console.log('Creating new schema...');

        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                image TEXT,
                provider VARCHAR(50) DEFAULT 'credentials',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Integrations table with user_id
        await pool.query(`
            CREATE TABLE IF NOT EXISTS integrations (
                id VARCHAR(50) NOT NULL,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                source VARCHAR(50) NOT NULL,
                destination VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'healthy',
                last_run TIMESTAMP WITH TIME ZONE,
                uptime VARCHAR(10) DEFAULT '100%',
                PRIMARY KEY (id, user_id)
            )
        `);

        // Activity logs with user_id
        await pool.query(`
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
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Settings with user_id
        await pool.query(`
            CREATE TABLE IF NOT EXISTS organization_settings (
                id SERIAL PRIMARY KEY,
                user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                api_key TEXT NOT NULL,
                email_alerts BOOLEAN DEFAULT true,
                slack_alerts BOOLEAN DEFAULT false,
                retention_days INTEGER DEFAULT 30
            )
        `);

        // BOM imports with user_id
        await pool.query(`
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
            )
        `);

        // Create indexes for performance
        await pool.query('CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_bom_imports_user ON bom_imports(user_id)');

        console.log('✅ Multi-tenant migration complete!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
