-- +goose Up
-- ==============================================================================
-- MEOWSHADOW LAB - MIGRATION 00005: ADD STATUS TO LESSONS
-- ==============================================================================

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'READY';
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons (status);

-- +goose Down
DROP INDEX IF EXISTS idx_lessons_status;
ALTER TABLE lessons DROP COLUMN IF EXISTS status;
