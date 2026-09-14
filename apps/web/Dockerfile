# ==============================================================================
# MEOWSHADOW LAB - WEB STUDIO DOCKERFILE (apps/web/Dockerfile)
# Multi-stage build optimized for Next.js 15 App Router in Standalone mode
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. BASE STAGE: Alpine Linux with Node.js 20 and pnpm package manager
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
RUN apk add --no-cache libc6-compat

# ------------------------------------------------------------------------------
# 2. DEPENDENCIES STAGE: Cache and install monorepo workspace dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy root workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package-level manifests
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/web/package.json ./apps/web/

# Install dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# 3. BUILDER STAGE: Compile shared packages and Next.js standalone application
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy cached dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source trees
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY packages/api-client ./packages/api-client
COPY apps/web ./apps/web

# Build internal dependencies in order
RUN pnpm --filter @meowshadow/types run build
RUN pnpm --filter @meowshadow/api-client run build

# Build Next.js standalone distribution
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV INTERNAL_API_URL=http://gateway-core:8000
RUN pnpm --filter @meowshadow/web run build

# ------------------------------------------------------------------------------
# 4. RUNNER STAGE: Minimal non-root production container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV INTERNAL_API_URL=http://gateway-core:8000

# Security: Run as dedicated non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone bundle
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
