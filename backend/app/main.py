import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.db.base import engine, Base
import app.db.models  # Ensure models are registered with Base.metadata before create_all
from app.api.main import router as api_router
from app.services.monitor_service import run_periodic_monitoring
from app.services.telegram_bot import setup_bot_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("airdrop_tracker")

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not present
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")

    # Start Background Scheduler for campaign monitoring
    scheduler.add_job(
        run_periodic_monitoring, 
        "interval", 
        minutes=settings.MONITOR_CHECK_INTERVAL_MINUTES,
        id="campaign_monitor"
    )
    scheduler.start()
    logger.info(f"Campaign monitor scheduler started (interval={settings.MONITOR_CHECK_INTERVAL_MINUTES}m).")

    # Start Telegram Bot polling in background if token exists
    bot_app = setup_bot_app()
    if bot_app:
        asyncio.create_task(bot_app.initialize())
        asyncio.create_task(bot_app.start())
        asyncio.create_task(bot_app.updater.start_polling())
        logger.info("Telegram Bot polling started.")

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown()
    if bot_app:
        await bot_app.updater.stop()
        await bot_app.stop()
        await bot_app.shutdown()
    await engine.dispose()
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Web3 Airdrop Scanner, Task Tracker, and Campaign Monitor API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(api_router)

@app.get("/health")
@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": "1.0.0"}
