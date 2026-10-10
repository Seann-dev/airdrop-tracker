# AIRDROP TRACKER AI

Automated Web3 Campaign Scanner, Task Tracker, and Telegram Mini App.

## Architecture

- **Backend**: FastAPI (Python 3.14 async), SQLAlchemy, aiosqlite, Pydantic V2, APScheduler.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, responsive dark Web3 UI.
- **Mobile / Telegram**: Standalone Telegram Mini App route `/app` with Telegram WebApp SDK support and backend HMAC-SHA256 signature verification.
- **Bot**: Python Telegram Bot (`/start`, `/app`, `/today`, `/pending`, `/deadlines`, `/projects`).
- **Universal Scanner & Adapters**: Modular architecture supporting Galxe, Layer3, Zealy, TaskOn, and Generic Web3 websites with SSRF protection (private IP blocking, redirect loop validation, content length limits).
- **AI Engine**: Optional LLM-assisted refinement (OpenAI/Groq compatible) with graceful fallback to heuristic parsers.

## Features

1. **Universal URL Scanner**: Extracts project info, categories, deadlines, rewards, and tasks from URLs with source attribution and confidence scoring.
2. **SSRF Guard**: Blocks RFC 1918, loopback, cloud metadata IPs, non-HTTP schemes, and validates redirect chains.
3. **Task Tracking & Recurrence**: Supports daily, weekly, and monthly recurrence without overwriting completion history.
4. **Campaign Monitoring**: Background scheduled jobs detect new tasks, deadline updates, and emit notifications.
5. **Farming Cost Tracking**: Log gas fees, bridge fees, and tx fees per campaign.
6. **User Isolation**: Enforced across every project, task, cost, and notification endpoint.

## Quick Start

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host
```

### 3. Run Test Suite
```bash
cd backend
PYTHONPATH=. pytest -v
cd ../frontend
npm run build
```

## Endpoints Summary

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login & JWT issuance
- `POST /api/v1/auth/telegram` - Telegram Mini App HMAC-SHA256 validation
- `POST /api/v1/scanner/scan` - Universal campaign URL scanner
- `POST /api/v1/scanner/confirm` - Save scanned preview to personal tracker
- `GET/POST /api/v1/projects` - Project CRUD
- `GET/POST /api/v1/tasks` - Task CRUD
- `POST /api/v1/tasks/{id}/complete` - Mark complete and trigger recurrence
- `GET /api/v1/dashboard/stats` - Live database statistics
- `GET /api/v1/notifications` - Notifications and alerts
- `GET/POST /api/v1/costs` - Farming cost tracker
