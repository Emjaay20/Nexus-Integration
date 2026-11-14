-- Add the field to databases created before idempotency support.
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_idempotency_key_key ON activity_logs(idempotency_key);
