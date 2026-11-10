import hmac
import os

API_KEY = os.environ["API_KEY"]
if len(API_KEY) != 64:
    raise RuntimeError("API_KEY deve ser uma chave hexadecimal de 64 caracteres.")


def has_valid_api_key(value: str | None) -> bool:
    return value is not None and hmac.compare_digest(value, API_KEY)
