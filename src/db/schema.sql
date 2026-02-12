CREATE TABLE IF NOT EXISTS integrations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    destination VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    last_run TIMESTAMP WITH TIME ZONE,
    uptime VARCHAR(10) DEFAULT '100%'
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    integration_id VARCHAR(50),
    event VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    duration VARCHAR(20),
    payload TEXT,
    response TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data if table is empty
INSERT INTO integrations (id, name, source, destination, status, last_run, uptime)
VALUES 
    ('ecommerce-sync', 'E-Commerce Sync', 'shopify', 'netsuite', 'healthy', NOW() - INTERVAL '2 minutes', '99.9%'),
    ('plm-erp', 'PLM to ERP', 'arena', 'sap', 'healthy', NOW() - INTERVAL '1 hour', '98.5%'),
    ('crm-updates', 'CRM Updates', 'salesforce', 'slack', 'error', NOW() - INTERVAL '5 minutes', '95.2%'),
    ('bom-importer', 'BOM Importer', 'file-upload', 'nexus', 'healthy', NOW(), '100%')
ON CONFLICT (id) DO NOTHING;

-- Settings Table
CREATE TABLE IF NOT EXISTS organization_settings (
    id SERIAL PRIMARY KEY,
    api_key TEXT NOT NULL,
    email_alerts BOOLEAN DEFAULT true,
    slack_alerts BOOLEAN DEFAULT false,
    retention_days INTEGER DEFAULT 30
);

-- Seed default settings
INSERT INTO organization_settings (id, api_key, email_alerts, slack_alerts, retention_days)
SELECT 1, 'sk_live_' || md5(random()::text), true, false, 30
WHERE NOT EXISTS (SELECT 1 FROM organization_settings WHERE id = 1);

-- BOM Imports Table
CREATE TABLE IF NOT EXISTS bom_imports (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER NOT NULL,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    warning_rows INTEGER NOT NULL DEFAULT 0,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
