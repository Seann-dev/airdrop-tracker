import os

class Settings:
    PROJECT_NAME: str = "AIRDROP TRACKER AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "airdrop_tracker_secret_super_secure_key_2026_dev")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")) # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:////data/airdrop_tracker.db")
    
    # Telegram Bot & Mini App
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_MINI_APP_URL: str = os.getenv("TELEGRAM_MINI_APP_URL", "http://localhost:5173/app")
    
    # AI Extraction Config (Optional)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openai")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    
    # Timezone & Monitoring
    DEFAULT_TIMEZONE: str = os.getenv("DEFAULT_TIMEZONE", "Asia/Jakarta")
    MONITOR_CHECK_INTERVAL_MINUTES: int = int(os.getenv("MONITOR_CHECK_INTERVAL_MINUTES", "60"))
    
    # SSRF Protection
    SSRF_MAX_REDIRECTS: int = 5
    SSRF_TIMEOUT: float = 10.0
    SSRF_MAX_CONTENT_LENGTH: int = 5 * 1024 * 1024 # 5 MB

settings = Settings()
