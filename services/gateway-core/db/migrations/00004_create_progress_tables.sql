-- +goose Up
-- ==============================================================================
-- MEOWSHADOW LAB - MIGRATION 00004: LEARNING PROGRESS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    playback_offset_sec NUMERIC(6, 2) DEFAULT 0.0,
    shadowing_repeat_count INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Version field for offline sync resolution (Mobile SQLite Sync)
    version INT DEFAULT 1,
    
    last_listened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Ensure version column exists if table was previously created
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_progress_user ON learning_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON learning_progress (lesson_id);

-- +goose Down
DROP TABLE IF EXISTS learning_progress;
