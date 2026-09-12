# TRIỂN KHAI 100% DOCKER-FIRST (DOCKER CONTAINERIZATION & ORCHESTRATION)
## DỰ ÁN: MEOWSHADOW LAB (MSL-DOCKER)
### HỆ THỐNG CONTAINER ĐỘC LẬP & KHỞI CHẠY 1-CLICK VỚI DOCKER COMPOSE

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `docs/3_DOCKER_CONTAINERIZATION.md` |
| **Phiên bản** | 3.1.0 |
| **Mục tiêu triển khai** | **100% Docker Containerized (Postgres, Redis, Go Gateway, Python Workers, Next.js Web)** |
| **Orchestration Tool** | **Docker Compose v2 (`docker-compose.yml`)** |
| **Tài liệu tham chiếu** | [2_ARCHITECTURE_TECHSTACK.md](./2_ARCHITECTURE_TECHSTACK.md) |

---

## 1. NGUYÊN TẮC THIẾT KẾ 100% DOCKER-FIRST

1. **Zero Host Dependency:** Người dùng hoặc lập trình viên chỉ cần cài đặt **Docker Desktop** (hoặc Docker Engine); không cần cài đặt thủ công Python, Go, Node.js, FFmpeg hay PostgreSQL trên máy chủ.
2. **Multi-Stage Build Tối Ưu:**
   * **Golang Gateway:** Build bằng `golang:1.23-alpine`, xuất ra image `scratch` hoặc `alpine` chỉ nặng **~20MB**.
   * **Next.js Web:** Build standalone production bundle tối ưu bằng Node.js 20 Alpine.
   * **Python Workers:** Sử dụng `python:3.11-slim` tích hợp sẵn `ffmpeg`.
3. **Shared Volume Isolation:** Dùng chung Docker Volume `storage-data` để các container đọc/ghi các file audio clips và file xuất xưởng `.mp3` / `.srt` an toàn.
4. **Internal Bridge Network:** Mạng ảo nội bộ `meowshadow-network` đảm bảo các microservices giao tiếp nội bộ tốc độ cao và an toàn.

---

## 2. KIẾN TRÚC MẠNG VÀ CÁC CONTAINER (CONTAINER TOPOLOGY)

```mermaid
flowchart TD
    subgraph Host Ports [Các Cổng Công Khai Ra Máy Chủ Host]
        P3000[Port 3000: Next.js Web]
        P8000[Port 8000: Go API Gateway]
        P5432[Port 5432: PostgreSQL]
        P6379[Port 6379: Redis]
    end

    subgraph Docker Network [meowshadow-network - Docker Bridge]
        WEB[c_frontend_web\nNext.js 15]
        GW[c_gateway_core\nGolang Fiber]
        PG[(c_postgres_db\nPostgreSQL 16)]
        REDIS[(c_redis_broker\nRedis 7 Alpine)]
        
        SVC1[c_script_llm\nPython FastAPI]
        SVC2[c_tts_engine\nPython FastAPI]
        SVC3[c_audio_processor\nPython FastAPI + FFmpeg]
    end

    subgraph Docker Volumes [Shared Persistent Storage]
        VOL_PG[(postgres-data)]
        VOL_STORAGE[(storage-data\n/app/storage)]
    end

    P3000 --> WEB
    P8000 --> GW
    P5432 --> PG
    P6379 --> REDIS

    WEB -->|Gọi API| GW
    GW --> PG
    GW --> REDIS
    PG --- VOL_PG

    REDIS <--> SVC1
    REDIS <--> SVC2
    REDIS <--> SVC3

    SVC2 & SVC3 & GW --- VOL_STORAGE
```

---

## 3. FILE ĐIỀU PHỐI `docker-compose.yml` HOÀN CHỈNH

Dưới đây là cấu hình chuẩn của file `docker-compose.yml` ở thư mục gốc:

```yaml
version: '3.8'

networks:
  meowshadow-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  storage-data:

services:
  # 1. Primary PostgreSQL database
  postgres-db:
    image: postgres:16-alpine
    container_name: meowshadow_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: meowuser
      POSTGRES_PASSWORD: meowpassword
      POSTGRES_DB: meowshadow_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./services/gateway-core/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - meowshadow-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U meowuser -d meowshadow_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. In-Memory Broker & Cache Redis
  redis-broker:
    image: redis:7-alpine
    container_name: meowshadow_redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - meowshadow-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 3. Golang Core API Gateway & Streaming Server
  gateway-core:
    build:
      context: .
      dockerfile: services/gateway-core/Dockerfile
    container_name: meowshadow_gateway
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - DATABASE_URL=postgres://meowuser:meowpassword@postgres-db:5432/meowshadow_db?sslmode=disable
      - REDIS_ADDR=redis-broker:6379
      - STORAGE_DIR=/app/storage
    volumes:
      - storage-data:/app/storage
    depends_on:
      postgres-db:
        condition: service_healthy
      redis-broker:
        condition: service_healthy
    networks:
      - meowshadow-network

  # 4. Python Worker: Script & LLM Translation Service
  script-llm-service:
    build:
      context: .
      dockerfile: services/script-llm/Dockerfile
    container_name: meowshadow_script_llm
    restart: unless-stopped
    environment:
      - REDIS_ADDR=redis-broker:6379
      - OLLAMA_HOST=http://host.docker.internal:11434
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      redis-broker:
        condition: service_healthy
    networks:
      - meowshadow-network

  # 5. Python Worker: Multi-TTS Engine Synthesis Service
  tts-engine-service:
    build:
      context: .
      dockerfile: services/tts-engine/Dockerfile
    container_name: meowshadow_tts_engine
    restart: unless-stopped
    environment:
      - REDIS_ADDR=redis-broker:6379
      - STORAGE_DIR=/app/storage
    volumes:
      - storage-data:/app/storage
    depends_on:
      redis-broker:
        condition: service_healthy
    networks:
      - meowshadow-network

  # 6. Python Worker: Audio Processor & Subtitle Generator
  audio-processor-service:
    build:
      context: .
      dockerfile: services/audio-processor/Dockerfile
    container_name: meowshadow_audio_processor
    restart: unless-stopped
    environment:
      - REDIS_ADDR=redis-broker:6379
      - STORAGE_DIR=/app/storage
    volumes:
      - storage-data:/app/storage
    depends_on:
      redis-broker:
        condition: service_healthy
    networks:
      - meowshadow-network

  # 7. Frontend Web Studio (Next.js 15 TypeScript)
  frontend-web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: meowshadow_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
    depends_on:
      - gateway-core
    networks:
      - meowshadow-network
```

---

## 4. HƯỚNG DẪN VẬN HÀNH 1-CLICK (OPERATIONAL RUNBOOK)

### 4.1. Lệnh Khởi Chạy
```bash
# Start all services in background
docker compose up --build -d

# View real-time logs of all services
docker compose logs -f

# View Go Gateway logs specifically
docker compose logs -f gateway-core
```

### 4.2. Lệnh Dừng & Dọn Dẹp
```bash
# Stop containers
docker compose down

# Stop and wipe all persistent volume data (Clean state)
docker compose down -v
```
