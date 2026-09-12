-- name: GetLessonByID :one
SELECT id, user_id, title, target_language, source_language, total_words, duration_sec,
       pacing_config, transcript_chunks, audio_file_path, srt_file_path, status, created_at, updated_at
FROM lessons
WHERE id = $1 LIMIT 1;

-- name: ListLessonsByUserID :many
SELECT id, user_id, title, target_language, source_language, total_words, duration_sec,
       pacing_config, transcript_chunks, audio_file_path, srt_file_path, status, created_at, updated_at
FROM lessons
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountLessonsByUserID :one
SELECT COUNT(*)
FROM lessons
WHERE user_id = $1;

-- name: CreateLesson :one
INSERT INTO lessons (
    user_id, title, target_language, source_language, total_words, duration_sec,
    pacing_config, transcript_chunks, audio_file_path, srt_file_path, embedding, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
RETURNING id, title, status, created_at;

-- name: UpdateLessonStatus :exec
UPDATE lessons
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- name: UpdateLessonRenderResult :one
UPDATE lessons
SET status = $2,
    audio_file_path = $3,
    srt_file_path = $4,
    duration_sec = $5,
    transcript_chunks = $6,
    total_words = $7,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, title, status, audio_file_path, srt_file_path, duration_sec, updated_at;

-- name: UpsertLearningProgress :exec
INSERT INTO learning_progress (
    user_id, lesson_id, playback_offset_sec, shadowing_repeat_count, is_completed, version
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    playback_offset_sec = EXCLUDED.playback_offset_sec,
    shadowing_repeat_count = EXCLUDED.shadowing_repeat_count,
    is_completed = EXCLUDED.is_completed,
    version = learning_progress.version + 1,
    last_listened_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;

-- name: GetLearningProgress :one
SELECT user_id, lesson_id, playback_offset_sec, shadowing_repeat_count, is_completed, version, last_listened_at
FROM learning_progress
WHERE user_id = $1 AND lesson_id = $2 LIMIT 1;

-- name: DeleteLesson :exec
DELETE FROM lessons
WHERE id = $1;

-- name: ListAllLessons :many
SELECT id, user_id, title, target_language, source_language, total_words, duration_sec,
       pacing_config, transcript_chunks, audio_file_path, srt_file_path, status, created_at, updated_at
FROM lessons
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountAllLessons :one
SELECT COUNT(*)
FROM lessons;
