-- Migration: Add credentials column to integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS credentials JSONB;
