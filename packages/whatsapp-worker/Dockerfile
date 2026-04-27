# syntax=docker/dockerfile:1.7

# ─── Builder stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build deps that some native modules might need (kept minimal — Baileys is pure JS).
# `git` is required when any npm dep resolves to a git URL.
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./
# `npm ci` requires a lockfile; if not present (first build), fall back to install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Trim dev dependencies for the runtime image.
RUN npm prune --omit=dev

# ─── Runtime stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Run as non-root user.
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app

# Default env (override at runtime).
ENV NODE_ENV=production \
    WHATSAPP_INSTANCE_ID=primary

# No ports exposed — worker is fully outbound (Firestore + WhatsApp WebSocket).
CMD ["node", "dist/index.js"]
