import hmac
import os

API_KEY = os.environ["API_KEY"]


def has_valid_api_key(value: str | None) -> bool:
    return value is not None and hmac.compare_digest(value, API_KEY)
