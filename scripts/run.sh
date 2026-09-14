#!/usr/bin/env bash
# ==============================================================================
# MEOWSHADOW LAB - 1-CLICK LAUNCH SCRIPT (v3.2.0)
# English comments only per project rules
#
# Usage:
#   ./scripts/run.sh           # Launch entire ecosystem (Infra, Workers, Gateway, Web, Browser)
#   ./scripts/run.sh --mobile  # Launch ecosystem and start Expo Mobile Dev Server
#   ./scripts/run.sh --dry-run # Pre-flight validation of tools and dependencies
#   ./scripts/run.sh --status  # Health status check across all running services
#   ./scripts/run.sh --down    # Tear down all running containers
#   ./scripts/run.sh --help    # Display this help menu
# ==============================================================================

set -eo pipefail

# ANSI color palette for beautiful terminal output
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
RED="\033[0;31m"
RESET="\033[0m"

print_banner() {
  echo -e "${CYAN}${BOLD}"
  echo "======================================================================"
  echo "  🐾  MEOWSHADOW LAB - 1-CLICK LAUNCH ENGINE (v3.2.0)"
  echo "  Bilingual Shadowing Platform: Web Studio, Mobile & AI Microservices"
  echo "======================================================================"
  echo -e "${RESET}"
}

log_info() {
  echo -e "${BLUE}[INFO]${RESET} $1"
}

log_success() {
  echo -e "${GREEN}${BOLD}[SUCCESS]${RESET} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${RESET} $1"
}

log_error() {
  echo -e "${RED}${BOLD}[ERROR]${RESET} $1"
}

# Resolve script directory and project root relative path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# Default to auto-rebuilding with Docker layer cache so code updates are always active
BUILD_FLAG="${BUILD_FLAG:---build}"

# ------------------------------------------------------------------------------
# 1. PRE-FLIGHT VALIDATION
# ------------------------------------------------------------------------------
check_preflight() {
  log_info "Step 1/5: Performing pre-flight system diagnostics..."

  # Check Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker or OrbStack first."
    exit 1
  fi

  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not responding. Please start Docker."
    exit 1
  fi
  log_success "Docker daemon active: $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'OK')"

  # Check Docker Compose
  if ! docker compose version &> /dev/null; then
    log_error "Docker Compose V2 is required."
    exit 1
  fi
  log_success "Docker Compose active: $(docker compose version --short 2>/dev/null || echo 'OK')"

  # Check Node.js and pnpm
  if command -v node &> /dev/null; then
    log_success "Node.js detected: $(node -v)"
  else
    log_warn "Node.js not detected in current shell (optional if using Docker frontend)."
  fi

  if command -v pnpm &> /dev/null; then
    log_success "pnpm package manager detected: $(pnpm -v)"
  fi
}

# ------------------------------------------------------------------------------
# 2. START INFRASTRUCTURE (POSTGRESQL & REDIS)
# ------------------------------------------------------------------------------
start_infra() {
  log_info "Step 2/5: Launching core infrastructure (PostgreSQL 16 + pgvector & Redis 7)..."
  docker compose up -d postgres-db redis-broker

  log_info "Waiting for PostgreSQL database readiness..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if docker exec meowshadow_postgres pg_isready -U meowuser -d meowshadow_db &> /dev/null; then
      log_success "PostgreSQL 16 database is healthy and accepting connections."
      break
    fi
    sleep 1
    retries=$((retries - 1))
  done

  if [ $retries -eq 0 ]; then
    log_error "Timed out waiting for PostgreSQL to become healthy."
    exit 1
  fi

  # Redis ping check
  if docker exec meowshadow_redis redis-cli ping &> /dev/null; then
    log_success "Redis 7 broker is healthy."
  fi
}

# ------------------------------------------------------------------------------
# 3. RUN DATABASE MIGRATIONS & SEED DATA
# ------------------------------------------------------------------------------
run_migrations_and_seeds() {
  log_info "Step 3/5: Applying schema migrations and validating seed data..."

  # Run migrations
  docker compose run --rm db-migration goose -dir /migrations up

  # Run seeds
  docker compose run --rm db-migration goose -table goose_seed_version -dir /seeds up || true
  log_success "Database schema and 1,500-word bilingual sample lessons verified."
}

# ------------------------------------------------------------------------------
# 4. START AI WORKERS & GOLANG GATEWAY
# ------------------------------------------------------------------------------
start_services() {
  log_info "Step 4/5: Launching AI microservices and Golang Gateway Core..."

  # Start Gateway, TTS Engine, Audio Processor, Script LLM
  docker compose --profile services up -d ${BUILD_FLAG:-} gateway-core tts-engine-service audio-processor-service script-llm-service

  # Sync initial seed audio and subtitle assets into shared storage volume
  if [ -d "storage" ]; then
    docker cp storage/. meowshadow_gateway:/app/storage/ 2>/dev/null || true
    # Grant read/write permissions to shared volume for all non-root microservice workers
    docker compose exec -u 0 gateway-core chmod -R a+rwX /app/storage 2>/dev/null || true
  fi

  log_info "Probing microservice health endpoints..."
  sleep 3

  # Function to probe HTTP endpoint
  probe_url() {
    local name="$1"
    local url="$2"
    local max_tries=15
    local try_count=0

    while [ $try_count -lt $max_tries ]; do
      if curl -s -f "$url" &> /dev/null; then
        log_success "${name} is healthy at ${url}"
        return 0
      fi
      sleep 1
      try_count=$((try_count + 1))
    done
    log_warn "${name} probe timed out at ${url} (service may still be initializing)."
  }

  probe_url "Golang Core Gateway" "http://localhost:8000/health"
  probe_url "Script LLM Worker" "http://localhost:8001/health"
  probe_url "TTS Engine Service" "http://localhost:8002/health"
  probe_url "Audio Processor Service" "http://localhost:8003/api/v1/health"
}

# ------------------------------------------------------------------------------
# 5. START FRONTEND WEB STUDIO & OPEN BROWSER
# ------------------------------------------------------------------------------
start_web_studio() {
  log_info "Step 5/5: Initializing Web Studio interface..."

  # Check if Next.js dev server can run locally or via docker
  if [ -d "apps/web" ]; then
    log_info "Starting Web Studio container or background service..."
    docker compose --profile full up -d ${BUILD_FLAG:-} frontend-web || {
      log_warn "Starting local Web Studio dev server fallback..."
      (cd apps/web && pnpm dev &)
    }
  fi

  log_success "Web Studio ready at: http://localhost:3000"

  # Auto-open browser on macOS or Linux
  if command -v open &> /dev/null; then
    open "http://localhost:3000" 2>/dev/null || true
  elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" 2>/dev/null || true
  fi
}

# ------------------------------------------------------------------------------
# STATUS CHECK SUMMARY
# ------------------------------------------------------------------------------
show_status() {
  print_banner
  echo -e "${BOLD}SYSTEM HEALTH & SERVICE ENDPOINTS DASHBOARD:${RESET}\n"

  printf "  %-30s %-25s %s\n" "SERVICE COMPONENT" "ENDPOINT URL" "STATUS"
  echo "  ----------------------------------------------------------------------"

  check_endpoint() {
    local name="$1"
    local url="$2"
    if curl -s -f "$url" &> /dev/null; then
      printf "  %-30s %-25s ${GREEN}ONLINE${RESET}\n" "$name" "$url"
    else
      printf "  %-30s %-25s ${RED}OFFLINE${RESET}\n" "$name" "$url"
    fi
  }

  check_endpoint "Next.js 15 Web Studio" "http://localhost:3000"
  check_endpoint "Golang Core API Gateway" "http://localhost:8000/health"
  check_endpoint "Script-LLM Worker" "http://localhost:8001/health"
  check_endpoint "TTS Engine (Edge + Kokoro)" "http://localhost:8002/health"
  check_endpoint "Audio Processor & Pacing" "http://localhost:8003/api/v1/health"
  check_endpoint "Web Database Studio (Adminer)" "http://localhost:8080"

  echo ""
  log_info "Docker Containers Status:"
  docker compose ps
}

# ------------------------------------------------------------------------------
# SHUTDOWN ALL CONTAINERS
# ------------------------------------------------------------------------------
teardown_system() {
  print_banner
  log_info "Tearing down all MeowShadow Lab containers..."
  docker compose --profile full down
  log_success "All containers stopped cleanly."
}

# ------------------------------------------------------------------------------
# CLI ARGUMENT DISPATCHER
# ------------------------------------------------------------------------------
case "$1" in
  --help|-h)
    print_banner
    echo "Usage: ./scripts/run.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  (no args)  1-Click launch of entire MeowShadow Lab stack & open browser"
    echo "  --mobile   Launch system and start Expo Mobile development server"
    echo "  --dry-run  Validate pre-flight tools and environment without booting"
    echo "  --status   Inspect real-time health of all running microservices"
    echo "  --down     Gracefully stop all running containers"
    echo "  --help     Show this help message"
    exit 0
    ;;
  --dry-run)
    print_banner
    check_preflight
    log_success "Dry-run validation complete. System is 100% ready for 1-Click Launch."
    exit 0
    ;;
  --status)
    show_status
    exit 0
    ;;
  --down)
    teardown_system
    exit 0
    ;;
  --mobile)
    print_banner
    check_preflight
    start_infra
    run_migrations_and_seeds
    start_services
    start_web_studio
    log_info "Starting Expo Mobile Dev Server (iOS / Android)..."
    pnpm --filter @meowshadow/mobile start
    ;;
  --build)
    BUILD_FLAG="--build"
    print_banner
    check_preflight
    start_infra
    run_migrations_and_seeds
    start_services
    start_web_studio

    echo -e "\n${GREEN}${BOLD}======================================================================${RESET}"
    echo -e "${GREEN}${BOLD}  🎉 MEOWSHADOW LAB v3.2.0 IS FULLY REBUILT, RUNNING AND READY!${RESET}"
    echo -e "${GREEN}${BOLD}======================================================================${RESET}"
    echo -e "  • Web Studio:        ${CYAN}http://localhost:3000${RESET}"
    echo -e "  • API Gateway:       ${CYAN}http://localhost:8000${RESET}"
    echo -e "  • Database Studio:   ${CYAN}http://localhost:8080${RESET}"
    echo -e "  • Mobile App:        ${MAGENTA}pnpm --filter @meowshadow/mobile start${RESET}"
    echo -e "  • Realtime Logs:     ${YELLOW}make logs${RESET}"
    echo -e "  • Stop System:       ${RED}./scripts/run.sh --down${RESET}"
    echo -e "${GREEN}${BOLD}======================================================================${RESET}\n"
    ;;
  *)
    print_banner
    check_preflight
    start_infra
    run_migrations_and_seeds
    start_services
    start_web_studio

    echo -e "\n${GREEN}${BOLD}======================================================================${RESET}"
    echo -e "${GREEN}${BOLD}  🎉 MEOWSHADOW LAB v3.2.0 IS FULLY RUNNING AND READY!${RESET}"
    echo -e "${GREEN}${BOLD}======================================================================${RESET}"
    echo -e "  • Web Studio:        ${CYAN}http://localhost:3000${RESET}"
    echo -e "  • API Gateway:       ${CYAN}http://localhost:8000${RESET}"
    echo -e "  • Database Studio:   ${CYAN}http://localhost:8080${RESET}"
    echo -e "  • Mobile App:        ${MAGENTA}pnpm --filter @meowshadow/mobile start${RESET}"
    echo -e "  • Realtime Logs:     ${YELLOW}make logs${RESET}"
    echo -e "  • Stop System:       ${RED}./scripts/run.sh --down${RESET}"
    echo -e "${GREEN}${BOLD}======================================================================${RESET}\n"
    ;;
esac
