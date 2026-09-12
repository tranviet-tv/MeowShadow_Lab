.PHONY: help up down logs ps restart psql redis-cli clean test-infra db-status db-migrate db-rollback db-seed db-studio

# Default help target
help:
	@echo "======================================================================"
	@echo "  MEOWSHADOW LAB - DEV CLI COMMANDS"
	@echo "======================================================================"
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
	@echo "    make db-studio   - Launch Web Database Studio (http://localhost:8080)"
	@echo "======================================================================"

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

# Launch Web Database Studio
db-studio:
	docker compose up -d db-studio
	@echo "Web Database Studio ready at: http://localhost:8080"
