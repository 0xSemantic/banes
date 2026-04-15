"""
Banesco Bank - App Configuration
All configurable settings in one place. Easy to customize for reuse.
"""
import os
from typing import List
from dotenv import load_dotenv
load_dotenv()

class Settings:
    # =========================================================
    # BANK IDENTITY - Change these to rebrand the app
    # =========================================================
    APP_NAME: str = os.getenv("APP_NAME", "Banesco Bank")
    APP_TAGLINE: str = os.getenv("APP_TAGLINE", "Banking That Works For You")
    APP_LOGO: str = os.getenv("APP_LOGO", "/static/logo.png")
    APP_FAVICON: str = os.getenv("APP_FAVICON", "/static/favicon.ico")
    
    # =========================================================
    # THEME COLORS - CSS variable overrides
    # =========================================================
    PRIMARY_COLOR: str = os.getenv("PRIMARY_COLOR", "#1a56db")
    PRIMARY_DARK: str = os.getenv("PRIMARY_DARK", "#0a2e8a")
    ACCENT_COLOR: str = os.getenv("ACCENT_COLOR", "#06b6d4")
    SURFACE_COLOR: str = os.getenv("SURFACE_COLOR", "#0f1f3d")
    
    # =========================================================
    # SECURITY
    # =========================================================
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    
    # =========================================================
    # ADMIN CREDENTIALS - Change these!
    # =========================================================
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD")
    
    # =========================================================
    # DATABASE – Turso (production) or local SQLite (development)
    # =========================================================
    TURSO_URL = os.getenv("TURSO_URL")          # e.g., libsql://your-db.turso.io
    TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")
    
    if TURSO_URL and TURSO_AUTH_TOKEN:
        # Production: Use Turso
        # Convert libsql:// URL to https:// for the HTTP API
        if TURSO_URL.startswith("libsql://"):
            TURSO_HTTP_URL = TURSO_URL.replace("libsql://", "https://")
        else:
            TURSO_HTTP_URL = TURSO_URL
        DATABASE_TYPE = "turso"
        # Keep a fallback DATABASE_URL for compatibility (not used by turso-python)
        DATABASE_URL = f"sqlite+{TURSO_URL}?authToken={TURSO_AUTH_TOKEN}"
    else:
        # Development: Use local SQLite file
        DATABASE_TYPE = "sqlite"
        DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./credex.db")
        TURSO_HTTP_URL = None
        TURSO_AUTH_TOKEN = None
        
    # =========================================================
    # SUPPORTED CURRENCIES
    # Easy to add more: just add to this list
    # =========================================================
    SUPPORTED_CURRENCIES: List[dict] = [
        {"code": "USD", "name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
        {"code": "GBP", "name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
        {"code": "EUR", "name": "Euro", "symbol": "€", "flag": "🇪🇺"},
        # Add more currencies here easily:
        # {"code": "NGN", "name": "Nigerian Naira", "symbol": "₦", "flag": "🇳🇬"},
        # {"code": "JPY", "name": "Japanese Yen", "symbol": "¥", "flag": "🇯🇵"},
        # {"code": "CAD", "name": "Canadian Dollar", "symbol": "CA$", "flag": "🇨🇦"},
    ]
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "USD")
    
    # =========================================================
    # SAVINGS TIERS - Default configuration
    # Admin can override these from the dashboard
    # =========================================================
    DEFAULT_SAVINGS_TIERS: List[dict] = [
        {
            "name": "Basic Saver",
            "min_balance": 0,
            "max_balance": 9999,
            "daily_interest_rate": 0.01,  # 0.01% per day = ~3.65% APY
            "color": "#10b981",
            "icon": "piggy-bank"
        },
        {
            "name": "Premium Saver",
            "min_balance": 10000,
            "max_balance": 49999,
            "daily_interest_rate": 0.025,  # 0.025% per day = ~9.13% APY
            "color": "#3b82f6",
            "icon": "trending-up"
        },
        {
            "name": "Elite Saver",
            "min_balance": 50000,
            "max_balance": 999999999,
            "daily_interest_rate": 0.05,  # 0.05% per day = ~18.25% APY
            "color": "#f59e0b",
            "icon": "crown"
        }
    ]
    
    # =========================================================
    # LOAN SETTINGS
    # =========================================================
    MAX_LOAN_AMOUNT: float = float(os.getenv("MAX_LOAN_AMOUNT", "100000"))
    MIN_LOAN_AMOUNT: float = float(os.getenv("MIN_LOAN_AMOUNT", "100"))
    LOAN_INTEREST_RATE: float = float(os.getenv("LOAN_INTEREST_RATE", "5.0"))  # % per month
    
    # =========================================================
    # EXCHANGE RATE API
    # Using free open exchange rates API (no key needed for basic)
    # =========================================================
    EXCHANGE_RATE_API: str = "https://open.er-api.com/v6/latest/USD"
    
    # =========================================================
    # PWA SETTINGS
    # =========================================================
    PWA_NAME: str = os.getenv("PWA_NAME", "Banesco Bank")
    PWA_SHORT_NAME: str = os.getenv("PWA_SHORT_NAME", "Banesco")
    PWA_THEME_COLOR: str = os.getenv("PWA_THEME_COLOR", "#0f1f3d")
    PWA_BG_COLOR: str = os.getenv("PWA_BG_COLOR", "#0a1628")
    

settings = Settings()