"""
Credex Bank - Utility Functions
"""
import random
import string
import uuid
from datetime import datetime


def generate_account_number() -> str:
    """Generate a unique 10-digit account number"""
    return "".join([str(random.randint(0, 9)) for _ in range(10)])


def generate_loan_number() -> str:
    """Generate a loan reference number"""
    year = datetime.utcnow().year
    rand = "".join([str(random.randint(0, 9)) for _ in range(6)])
    return f"LN{year}{rand}"


def generate_card_number_masked() -> str:
    """Generate masked card number showing last 4 digits"""
    last4 = "".join([str(random.randint(0, 9)) for _ in range(4)])
    return f"**** **** **** {last4}"


def calculate_monthly_payment(principal: float, annual_rate: float, months: int) -> float:
    """Calculate EMI using standard formula"""
    if annual_rate == 0:
        return principal / months
    monthly_rate = (annual_rate / 100) / 12
    payment = principal * (monthly_rate * (1 + monthly_rate) ** months) / ((1 + monthly_rate) ** months - 1)
    return round(payment, 2)


def mask_email(email: str) -> str:
    """Mask email for display: j***@example.com"""
    parts = email.split("@")
    if len(parts) != 2:
        return email
    name = parts[0]
    masked = name[0] + "***" if len(name) > 1 else "***"
    return f"{masked}@{parts[1]}"
