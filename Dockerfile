# Airdrop Tracker AI — single-service Railway image.
# Serves the built React SPA and proxies /api/* to the FastAPI backend,
# so the frontend needs no API-URL config (it calls relative /api/v1).

# ---- Stage 1: build the frontend ----
FROM node:24-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: runtime ----
FROM python:3.14-slim
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./frontend/dist
COPY frontend/server.py ./frontend/server.py
COPY railway-start.sh ./railway-start.sh
RUN chmod +x ./railway-start.sh

ENV PYTHONPATH=/app/backend

# Railway injects $PORT at runtime; railway-start.sh maps it to the SPA server.
EXPOSE 8000
CMD ["./railway-start.sh"]
