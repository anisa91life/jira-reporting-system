-- Migration 001: Create migrations tracking table
-- This table tracks which migrations have been applied to the database.
-- Run this FIRST before any other migrations.

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example: After running this migration, insert a record:
-- INSERT INTO migrations (name) VALUES ('001_create_migrations_table');
