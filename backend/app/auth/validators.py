import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NICKNAME_RE = re.compile(r"^[A-Za-z0-9_]+$")

NICKNAME_MIN = 3
NICKNAME_MAX = 20
PASSWORD_MIN = 8


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_signup(email: str, nickname: str, password: str) -> str | None:
    if not EMAIL_RE.match(normalize_email(email)):
        return "email inválido"
    if not NICKNAME_MIN <= len(nickname) <= NICKNAME_MAX:
        return f"nickname deve ter entre {NICKNAME_MIN} e {NICKNAME_MAX} caracteres"
    if not NICKNAME_RE.match(nickname):
        return "nickname aceita apenas letras, números e _"
    if len(password) < PASSWORD_MIN:
        return f"senha deve ter pelo menos {PASSWORD_MIN} caracteres"
    return None
