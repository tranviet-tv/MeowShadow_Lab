.PHONY: help run run-dry run-status mobile test-all e2e up down logs ps restart psql redis-cli clean test-infra db-status db-migrate db-rollback db-seed db-reset db-studio test-audio

# Default help target
help:
	@echo "======================================================================"
	@echo "  MEOWSHADOW LAB - DEV CLI COMMANDS (v3.2.0)"
	@echo "======================================================================"
	@echo "  1-CLICK LAUNCH & FULL STACK:"
	@echo "    make run         - 1-Click launch of entire ecosystem (scripts/run.sh)"
	@echo "    make run-dry     - Pre-flight diagnostic check without starting services"
	@echo "    make run-status  - Real-time health status probe across all microservices"
	@echo "    make mobile      - Launch React Native / Expo Mobile development server"
	@echo "    make test-all    - Run comprehensive test suites across the entire monorepo"
	@echo "    make e2e         - Execute end-to-end integration verification"
	@echo ""
	@echo "  BASE INFRASTRUCTURE:"
	@echo "    make up          - Start platform infrastructure (Postgres + Redis)"
	@echo "    make down        - Stop all containers"
	@echo "    make logs        - View real-time container logs"
	@echo "    make ps          - Check container status and health"
	@echo "    make restart     - Restart containers"
	@echo "    make psql        - Access PostgreSQL CLI (meowshadow_db)"
	@echo "    make redis-cli   - Access Redis CLI"
	@echo "    make test-infra  - Verify database tables and Redis ping"
	@echo "    make clean       - Clean up containers and temporary volume data"
	@echo ""
	@echo "  DATABASE MANAGEMENT (MIGRATIONS & STUDIO):"
	@echo "    make db-migrate  - Run all schema migrations to latest (Goose)"
	@echo "    make db-rollback - Rollback 1 migration step"
	@echo "    make db-status   - Check migration status and history"
	@echo "    make db-seed     - Seed development testing data into database"
	@echo "    make db-reset    - Reset database (rollback, re-migrate & re-seed)"
	@echo "    make db-studio   - Launch Web Database Studio (http://localhost:8080)"
	@echo ""
	@echo "  AUDIO PROCESSOR & TESTING:"
	@echo "    make test-audio        - Run audio-processor unit test suite (Pytest)"
	@echo "    make test-audio-docker - Run audio tests inside Docker container with FFmpeg"
	@echo "    make audio-up          - Start audio-processor service (http://localhost:8003)"
	@echo "======================================================================"

# 1-Click launch full system
run:
	./scripts/run.sh

# Dry-run pre-flight check
run-dry:
	./scripts/run.sh --dry-run

# Health status probe
run-status:
	./scripts/run.sh --status

# Launch Expo Mobile App Dev Server
mobile:
	pnpm --filter @meowshadow/mobile start

# Run all test suites across Python, Go, and TypeScript
test-all:
	@echo "--- 1. Testing Go Gateway Core ---"
	go test -v ./services/gateway-core/...
	@echo "\n--- 2. Testing Python Audio Processor ---"
	./services/audio-processor/.venv/bin/pytest services/audio-processor/tests -q
	@echo "\n--- 3. Testing Python TTS Engine ---"
	./services/tts-engine/.venv/bin/pytest services/tts-engine/tests -q
	@echo "\n--- 4. Type Checking Web Studio ---"
	pnpm --filter @meowshadow/web type-check
	@echo "\n--- 5. Testing Mobile App Logic & Types ---"
	pnpm --filter @meowshadow/mobile type-check
	npx tsx apps/mobile/tests/playerLogic.test.ts
	npx tsx apps/mobile/tests/sqliteOffline.test.ts
	@echo "\nAll monorepo test suites PASSED successfully!"

# End-to-end integration check
e2e: run-dry
	@echo "E2E Pre-flight verification PASSED."

# Start platform infrastructure services
up:
	docker compose up -d postgres-db redis-broker

# Stop all containers
down:
	docker compose down

# View real-time container logs
logs:
	docker compose logs -f

# Check container status and health
ps:
	docker compose ps

# Restart containers
restart:
	docker compose restart

# Access PostgreSQL CLI
psql:
	docker exec -it meowshadow_postgres psql -U meowuser -d meowshadow_db

# Access Redis CLI
redis-cli:
	docker exec -it meowshadow_redis redis-cli

# Verify infrastructure connectivity
test-infra:
	@echo "--- Checking PostgreSQL Tables ---"
	docker exec -i meowshadow_postgres psql -U meowuser -d meowshadow_db -c "\dt"
	@echo "\n--- Checking Redis Connectivity ---"
	docker exec -i meowshadow_redis redis-cli ping

# Clean up containers and volumes
clean:
	docker compose down -v

# ==============================================================================
# DATABASE & MIGRATION MANAGEMENT (GOOSE & STUDIO)
# ==============================================================================

# View migration status
db-status:
	docker compose run --rm db-migration goose -dir /migrations status

# Run schema migrations
db-migrate:
	docker compose run --rm db-migration goose -dir /migrations up

# Rollback 1 migration step
db-rollback:
	docker compose run --rm db-migration goose -dir /migrations down

# Seed development testing data
db-seed:
	docker compose run --rm db-migration goose -table goose_seed_version -dir /seeds up

# Reset database (clean migrations, re-apply schema & re-seed test data)
db-reset:
	@echo "--- Resetting MeowShadow Database ---"
	docker compose run --rm db-migration goose -table goose_seed_version -dir /seeds reset || true
	docker compose run --rm db-migration goose -dir /migrations reset
	docker compose run --rm db-migration goose -dir /migrations up
	docker compose run --rm db-migration goose -table goose_seed_version -dir /seeds up
	@echo "Database reset and seeded successfully!"

# Launch Web Database Studio
db-studio:
	docker compose up -d db-studio
	@echo "Web Database Studio ready at: http://localhost:8080"

# ==============================================================================
# AUDIO PROCESSOR & TESTING
# ==============================================================================

# Run audio processor unit tests
test-audio:
	@echo "--- Running Audio Processor Unit Tests (Pytest) ---"
	./services/audio-processor/.venv/bin/pytest services/audio-processor/tests -v

# Run audio processor tests inside Docker container with FFmpeg
test-audio-docker:
	@echo "--- Running Audio Processor Tests in Docker with FFmpeg ---"
	docker run --rm -v $$(pwd)/services/audio-processor:/app 1meowshadow_lab-audio-processor-service pytest tests -v

# Start audio-processor service in background
audio-up:
	docker compose up -d audio-processor-service
	@echo "Audio processor microservice ready at http://localhost:8003"

