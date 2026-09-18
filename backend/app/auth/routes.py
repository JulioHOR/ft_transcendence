import psycopg2
from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from db import db_cursor

from .validators import normalize_email, validate_signup

auth_bp = Blueprint("auth", __name__)

SESSION_COOKIE_OPTIONS = {
    "SESSION_COOKIE_HTTPONLY": True,
    "SESSION_COOKIE_SECURE": True,
    "SESSION_COOKIE_SAMESITE": "Lax",
}

INVALID_CREDENTIALS = "credenciais inválidas"
UNAUTHENTICATED = "não autenticado"


def _text_fields(body: dict, *names: str) -> tuple[str, ...] | None:
    values = []
    for name in names:
        value = body.get(name)
        if not isinstance(value, str):
            return None
        values.append(value)
    return tuple(values)


def _json_body() -> dict:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def _conflict(cur, email: str, nickname: str) -> str | None:
    cur.execute(
        "SELECT email, nickname FROM users WHERE email = %s OR nickname = %s;",
        (email, nickname),
    )
    rows = cur.fetchall()
    if any(row[0] == email for row in rows):
        return "email já existe"
    if any(row[1] == nickname for row in rows):
        return "nickname já existe"
    return None


def _insert_user(cur, email: str, nickname: str, password_hash: str) -> int:
    cur.execute(
        "INSERT INTO users (email, nickname, password_hash) VALUES (%s, %s, %s) RETURNING id;",
        (email, nickname, password_hash),
    )
    row = cur.fetchone()
    if row is None:
        raise RuntimeError("INSERT RETURNING sem linha")
    return row[0]


@auth_bp.post("/api/auth/signup")
def signup():
    fields = _text_fields(_json_body(), "email", "nickname", "password")
    if fields is None:
        return jsonify({"error": "email, nickname e password devem ser texto"}), 400
    email, nickname, password = fields
    error = validate_signup(email, nickname, password)
    if error:
        return jsonify({"error": error}), 400
    email = normalize_email(email)
    try:
        with db_cursor() as cur:
            conflict = _conflict(cur, email, nickname)
            if conflict:
                return jsonify({"error": conflict}), 409
            user_id = _insert_user(cur, email, nickname, generate_password_hash(password))
    except psycopg2.IntegrityError:
        return jsonify({"error": "email ou nickname já existe"}), 409
    session["user_id"] = user_id
    return jsonify({"id": user_id, "email": email, "nickname": nickname}), 201


@auth_bp.post("/api/auth/login")
def login():
    fields = _text_fields(_json_body(), "email", "password")
    if fields is None:
        return jsonify({"error": INVALID_CREDENTIALS}), 401
    email, password = fields
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, email, nickname, password_hash FROM users WHERE email = %s;",
            (normalize_email(email),),
        )
        row = cur.fetchone()
    if row is None:
        return jsonify({"error": INVALID_CREDENTIALS}), 401
    user_id, email, nickname, password_hash = row
    if not check_password_hash(password_hash, password):
        return jsonify({"error": INVALID_CREDENTIALS}), 401
    session["user_id"] = user_id
    return jsonify({"id": user_id, "email": email, "nickname": nickname}), 200


@auth_bp.post("/api/auth/logout")
def logout():
    session.clear()
    return "", 204


@auth_bp.get("/api/me")
def me():
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": UNAUTHENTICATED}), 401
    with db_cursor() as cur:
        cur.execute(
            "SELECT email, nickname FROM users WHERE id = %s;",
            (user_id,),
        )
        row = cur.fetchone()
    if row is None:
        session.clear()
        return jsonify({"error": UNAUTHENTICATED}), 401
    return jsonify({"id": user_id, "email": row[0], "nickname": row[1]}), 200
