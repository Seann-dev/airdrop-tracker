# Airdrop Tracker v2 — Express API + React SPA, single Railway service.
# Frontend calls same-origin /api/* (proxied by Express in production).

# ---- Stage 1: build frontend ----
FROM node:24-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY frontend/ ./
# Publishable key is public by design; injected at build time.
# Railway exposes service Variables during the build phase, so setting
# VITE_CLERK_PUBLISHABLE_KEY as a regular Variable is enough — no separate
# "Build Arguments" UI option needed. Docker picks it up via ARG below.
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
# Fail fast with a clear message instead of shipping a broken app
RUN if [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ]; then echo "ERROR: VITE_CLERK_PUBLISHABLE_KEY is not set. Add it as a Railway Variable (it is exposed at build time)." >&2; exit 1; fi
RUN npm run build

# ---- Stage 2: backend runtime ----
FROM node:24-slim
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
# Install all deps (incl. typescript) to compile, then prune dev deps
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY backend/ ./
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

# Serve the SPA from Express (static) — no separate frontend server needed
COPY --from=frontend-build /build/dist ./public

ENV NODE_ENV=production
EXPOSE 8000
# Run idempotent DB migration before starting (fails deploy loudly on error)
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
