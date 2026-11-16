# ==========================================
# Production Multi-Stage Dockerfile for Dr. Doc
# Includes LibreOffice, Poppler-utils & Node.js
# ==========================================

# 1. Base dependencies stage
FROM node:20-bookworm-slim AS base
ENV DEBIAN_FRONTEND=noninteractive

# Install LibreOffice, Poppler (pdftoppm, pdftotext), Fonts & Java runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    poppler-utils \
    fonts-liberation \
    fonts-dejavu-core \
    default-jre-headless \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm matching packageManager in package.json
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate

WORKDIR /app

# 2. Dependencies installation stage
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3. Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# 4. Production Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged nextjs user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets & static files
COPY --from=builder /app/public ./public

# Automatically leverage standalone output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set permissions for /tmp directory so nextjs user can run isolated LibreOffice profiles
RUN chmod 1777 /tmp

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

