-- Migration 002: Create manual risks table
-- This table stores user-defined delivery risks for the PMO Sprint Report.

CREATE TABLE IF NOT EXISTS manual_risks (
    id SERIAL PRIMARY KEY,
    project_key VARCHAR(255) NOT NULL,
    sprint_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for faster lookups by project and sprint
CREATE INDEX idx_manual_risks_project_sprint ON manual_risks(project_key, sprint_id);
