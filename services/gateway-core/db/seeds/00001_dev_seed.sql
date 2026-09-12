-- +goose Up
-- ==============================================================================
-- MEOWSHADOW LAB - SEED 00001: DEVELOPER TESTING DATA
-- ==============================================================================

-- 1. Seed sample admin account (Password: 'password123')
INSERT INTO users (id, email, password_hash, full_name)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@meowshadow.lab',
    '$2a$12$e8q4lVvX6b5w3yKjN9.CtuF59cW3hXfK7D1yI9w2lFkE8X1A6Q6Zy',
    'MeowShadow Admin'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

-- 2. Seed sample lesson 01 (Bilingual English - Vietnamese)
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
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    pacing_config = EXCLUDED.pacing_config,
    transcript_chunks = EXCLUDED.transcript_chunks;

-- 3. Seed sample learning progress record
INSERT INTO learning_progress (
    user_id,
    lesson_id,
    playback_offset_sec,
    shadowing_repeat_count,
    is_completed,
    version
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    18.5,
    3,
    FALSE,
    1
) ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    playback_offset_sec = EXCLUDED.playback_offset_sec,
    shadowing_repeat_count = EXCLUDED.shadowing_repeat_count;

-- +goose Down
DELETE FROM learning_progress WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM lessons WHERE id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE id = 'a0000000-0000-0000-0000-000000000001';
