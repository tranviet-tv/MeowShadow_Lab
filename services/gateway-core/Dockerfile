# ==============================================================================
# Stage 1: Build binary using official Go Alpine image
# ==============================================================================
FROM golang:alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Cache module dependencies
COPY services/gateway-core/go.mod services/gateway-core/go.sum ./
RUN go mod download

# Copy service source code
COPY services/gateway-core/ ./

# Build optimized static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/gateway-core ./cmd/server/main.go

# ==============================================================================
# Stage 2: Minimal runner image (< 25MB)
# ==============================================================================
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates and curl for health check
RUN apk add --no-cache ca-certificates tzdata curl

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create storage directory structure with non-root permissions
RUN mkdir -p /app/storage/audio /app/storage/srt \
    && chown -R appuser:appgroup /app

# Copy binary from builder
COPY --from=builder /app/bin/gateway-core /app/gateway-core

# Ensure ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/gateway-core"]
