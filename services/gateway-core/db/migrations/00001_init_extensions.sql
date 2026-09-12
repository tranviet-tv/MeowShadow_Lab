-- +goose Up
-- ==============================================================================
-- MEOWSHADOW LAB - MIGRATION 00001: EXTENSIONS
-- ==============================================================================
-- Enable pgcrypto extension for secure random UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector extension (pgvector) for AI embeddings & semantic search
CREATE EXTENSION IF NOT EXISTS "vector";

-- +goose Down
DROP EXTENSION IF EXISTS "vector";
DROP EXTENSION IF EXISTS "pgcrypto";
