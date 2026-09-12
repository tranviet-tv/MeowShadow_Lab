-- +goose Up
-- ==============================================================================
-- MEOWSHADOW LAB - MIGRATION 00003: LESSONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    target_language VARCHAR(10) NOT NULL, -- 'en' | 'ja'
    source_language VARCHAR(10) DEFAULT 'vi',
    total_words INT DEFAULT 0,
    duration_sec NUMERIC(6, 2) DEFAULT 0.0,
    
    -- Applied pacing silence configuration
    pacing_config JSONB NOT NULL,
    
    -- Detailed sentences, language tags, and karaoke timestamps
    transcript_chunks JSONB NOT NULL,
    
    -- Audio and subtitle file paths in shared volume
    audio_file_path TEXT NOT NULL,
    srt_file_path TEXT NOT NULL,
    
    -- Vector embedding (1536 dimensions - compatible with OpenAI / Qwen Embedding) for semantic search
    embedding vector(1536),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure embedding column exists if table was previously created
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- GIN index for high-speed search inside transcript JSONB
CREATE INDEX IF NOT EXISTS idx_lessons_chunks ON lessons USING gin (transcript_chunks);
CREATE INDEX IF NOT EXISTS idx_lessons_user ON lessons (user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lang ON lessons (target_language);

-- HNSW index for ultra-fast vector similarity search (Cosine Distance)
CREATE INDEX IF NOT EXISTS idx_lessons_embedding ON lessons USING hnsw (embedding vector_cosine_ops);

-- +goose Down
DROP TABLE IF EXISTS lessons CASCADE;
