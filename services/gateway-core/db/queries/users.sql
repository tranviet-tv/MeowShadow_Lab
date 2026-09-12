-- name: GetUserByID :one
SELECT id, email, password_hash, full_name, created_at, updated_at
FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, full_name, created_at, updated_at
FROM users
WHERE email = $1 LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, full_name)
VALUES ($1, $2, $3)
RETURNING id, email, full_name, created_at;

-- name: UpsertUserDevice :exec
INSERT INTO user_devices (user_id, device_type, push_token)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, push_token) DO UPDATE SET
    device_type = EXCLUDED.device_type,
    updated_at = CURRENT_TIMESTAMP;

-- name: ListDevicesByUserID :many
SELECT id, user_id, device_type, push_token, updated_at
FROM user_devices
WHERE user_id = $1;
