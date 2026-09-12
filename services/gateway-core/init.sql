-- ==============================================================================
-- MEOWSHADOW LAB - POSTGRESQL 16 DATABASE INITIALIZATION SCRIPT
-- ==============================================================================
-- File: services/gateway-core/init.sql
-- Automatically executed on initial container startup of postgres-db.
-- ==============================================================================

-- 1. Enable pgcrypto extension for secure random UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Devices & Push Notification Tokens table
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(20) NOT NULL, -- 'ios' | 'android' | 'web'
    push_token TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, push_token)
);

-- 4. Lessons table
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
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GIN index for high-speed search inside transcript JSONB
CREATE INDEX IF NOT EXISTS idx_lessons_chunks ON lessons USING gin (transcript_chunks);
CREATE INDEX IF NOT EXISTS idx_lessons_user ON lessons (user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lang ON lessons (target_language);

-- 5. Learning & Shadowing Progress table
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    playback_offset_sec NUMERIC(6, 2) DEFAULT 0.0,
    shadowing_repeat_count INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_listened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- ==============================================================================
-- 6. INITIAL SEED DATA FOR DEVELOPER TESTING
-- ==============================================================================

-- Seed sample user (Default password: 'password123')
INSERT INTO users (id, email, password_hash, full_name)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@meowshadow.lab',
    '$2a$12$e8q4lVvX6b5w3yKjN9.CtuF59cW3hXfK7D1yI9w2lFkE8X1A6Q6Zy', -- bcrypt hash
    'MeowShadow Admin'
) ON CONFLICT (email) DO NOTHING;

-- Seed sample prepared lesson
INSERT INTO lessons (
    id,
    user_id,
    title,
    target_language,
    source_language,
    total_words,
    duration_sec,
    pacing_config,
    transcript_chunks,
    audio_file_path,
    srt_file_path
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Bài 01: Sức mạnh của sự kiên trì (The Power of Persistence)',
    'en',
    'vi',
    45,
    65.0,
    '{
        "viVoice": "vi-VN-HoaiMyNeural",
        "targetVoice": "en-US-JennyNeural",
        "viSpeed": 1.0,
        "targetSpeed": 1.0,
        "silenceAfterViSec": 1.5,
        "silenceAfterTargetSec": 3.5,
        "silenceBetweenSentencesSec": 0.5,
        "insertCueSound": true,
        "exportFormat": "mp3",
        "audioBitrate": "192k"
    }'::jsonb,
    '[
        {
            "id": "chunk_1",
            "order": 1,
            "lang": "vi",
            "text": "Kiên trì là bí quyết lớn nhất của mọi thành công."
        },
        {
            "id": "chunk_2",
            "order": 2,
            "lang": "en",
            "text": "Persistence is the greatest secret of all success."
        },
        {
            "id": "chunk_3",
            "order": 3,
            "lang": "vi",
            "text": "Mỗi ngày hãy dành ra mười lăm phút để luyện tập nhại giọng."
        },
        {
            "id": "chunk_4",
            "order": 4,
            "lang": "en",
            "text": "Spend fifteen minutes every day practicing shadowing."
        }
    ]'::jsonb,
    '/app/storage/seed_sample.mp3',
    '/app/storage/seed_sample.srt'
) ON CONFLICT (id) DO NOTHING;

-- Seed sample learning progress record
INSERT INTO learning_progress (
    user_id,
    lesson_id,
    playback_offset_sec,
    shadowing_repeat_count,
    is_completed
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    18.5,
    3,
    FALSE
) ON CONFLICT (user_id, lesson_id) DO NOTHING;
