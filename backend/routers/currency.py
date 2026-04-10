"""
Credex Bank - Currency Router
Real-time exchange rates using free open API
No API key required for basic rates
"""
import json
import time
from datetime import datetime
from fastapi import APIRouter, HTTPException
from ..config import settings

router = APIRouter()

# In-memory cache - avoids hammering the free API
_rate_cache = {"data": None, "timestamp": 0}
CACHE_DURATION = 3600  # 1 hour


async def fetch_rates_from_api() -> dict:
    """Fetch from open exchange rates API - no key needed"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.EXCHANGE_RATE_API)
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Exchange rate API error: {e}")
    return None


def get_fallback_rates() -> dict:
    """Fallback rates when API is unavailable"""
    return {
        "base": "USD",
        "rates": {
            "USD": 1.0,
            "GBP": 0.79,
            "EUR": 0.92,
            "NGN": 1580.0,
            "JPY": 149.5,
            "CAD": 1.36,
            "AUD": 1.53,
            "CHF": 0.88,
            "CNY": 7.24,
            "INR": 83.1,
        },
        "timestamp": int(time.time()),
        "updated_at": datetime.utcnow().isoformat(),
        "source": "fallback"
    }


@router.get("/rates")
async def get_exchange_rates(base: str = "USD"):
    """Get current exchange rates - cached for 1 hour"""
    global _rate_cache

    now = time.time()
    if _rate_cache["data"] and (now - _rate_cache["timestamp"]) < CACHE_DURATION:
        data = _rate_cache["data"]
    else:
        data = await fetch_rates_from_api()
        if data:
            _rate_cache = {"data": data, "timestamp": now}
        else:
            data = get_fallback_rates()

    rates = data.get("rates", {})
    base_upper = base.upper()

    # Convert to requested base currency
    if base_upper != "USD" and base_upper in rates:
        base_rate = rates[base_upper]
        converted_rates = {k: round(v / base_rate, 6) for k, v in rates.items()}
        converted_rates[base_upper] = 1.0
    else:
        converted_rates = rates

    # Filter to only supported currencies + common ones
    supported_codes = [c["code"] for c in settings.SUPPORTED_CURRENCIES]

    return {
        "base": base_upper,
        "rates": converted_rates,
        "supported_currencies": settings.SUPPORTED_CURRENCIES,
        "timestamp": data.get("timestamp", int(now)),
        "updated_at": datetime.utcnow().isoformat(),
        "cached": _rate_cache["data"] is not None
    }


@router.get("/convert")
async def convert_currency(amount: float, from_currency: str, to_currency: str):
    """Quick currency conversion"""
    rates_data = await get_exchange_rates("USD")
    rates = rates_data["rates"]

    from_upper = from_currency.upper()
    to_upper = to_currency.upper()

    if from_upper not in rates:
        raise HTTPException(status_code=400, detail=f"Currency {from_upper} not supported")
    if to_upper not in rates:
        raise HTTPException(status_code=400, detail=f"Currency {to_upper} not supported")

    # Convert via USD
    amount_in_usd = amount / rates[from_upper]
    converted = amount_in_usd * rates[to_upper]

    return {
        "from_currency": from_upper,
        "to_currency": to_upper,
        "original_amount": amount,
        "converted_amount": round(converted, 4),
        "rate": round(rates[to_upper] / rates[from_upper], 6),
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/supported")
async def get_supported_currencies():
    """Get list of supported currencies in the app"""
    return {
        "currencies": settings.SUPPORTED_CURRENCIES,
        "default": settings.DEFAULT_CURRENCY
    }
