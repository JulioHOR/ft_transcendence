import os

import psycopg2
from flask import jsonify, request, session
from flask_limiter.util import get_remote_address
from flask_smorest import Blueprint
from marshmallow import Schema, fields
from werkzeug.security import check_password_hash, generate_password_hash

from db import db_cursor
from rate_limit import limiter
from schemas import ErrorResponseSchema

from .validators import (
    NICKNAME_MAX,
    NICKNAME_MIN,
    PASSWORD_MIN,
    normalize_email,
    validate_email,
    validate_signup,
)

auth_bp = Blueprint(
    "auth",
    __name__,
    description="Contas de usuário e sessão por cookie.",
)

SESSION_COOKIE_OPTIONS = {
    "SESSION_COOKIE_HTTPONLY": True,
    "SESSION_COOKIE_SECURE": True,
    "SESSION_COOKIE_SAMESITE": "Lax",
}

INVALID_CREDENTIALS = "E-mail ou senha não conferem."

_DUMMY_PASSWORD_HASH = generate_password_hash(os.urandom(16).hex())


def login_rate_key():
    body = request.get_json(silent=True)
    email = body.get("email") if isinstance(body, dict) else None
    if isinstance(email, str) and email:
        return f"login:{email.strip().lower()}"
    return get_remote_address()


class UserSchema(Schema):
    id = fields.Integer(metadata={"description": "Identificador do usuário"})
    email = fields.String(metadata={"description": "E-mail normalizado (minúsculas)"})
    nickname = fields.String(metadata={"description": "Apelido público"})


SIGNUP_REQUEST_BODY = {
    "description": "Dados da nova conta.",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["email", "nickname", "password"],
                "properties": {
                    "email": {
                        "type": "string",
                        "format": "email",
                        "description": "E-mail; espaços são removidos e o valor é normalizado para minúsculas.",
                    },
                    "nickname": {
                        "type": "string",
                        "pattern": "^[A-Za-z0-9_]+$",
                        "minLength": NICKNAME_MIN,
                        "maxLength": NICKNAME_MAX,
                        "description": "Apelido público: letras, números e _.",
                    },
                    "password": {
                        "type": "string",
                        "minLength": PASSWORD_MIN,
                        "format": "password",
                        "description": f"Senha com pelo menos {PASSWORD_MIN} caracteres.",
                    },
                },
            },
            "example": {
                "email": "alice@example.com",
                "nickname": "alice_9",
                "password": "senha-forte-123",
            },
        }
    },
}

LOGIN_REQUEST_BODY = {
    "description": "Credenciais. Campos ausentes ou fora do tipo produzem o mesmo 401 genérico.",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                    "email": {"type": "string", "format": "email"},
                    "password": {"type": "string", "format": "password"},
                },
            },
            "example": {
                "email": "alice@example.com",
                "password": "senha-forte-123",
            },
        }
    },
}


def _text_fields(body: dict, *names: str) -> tuple[str, ...] | None:
    values = []
    for name in names:
        value = body.get(name)
        if not isinstance(value, str):
            return None
        values.append(value)
    return tuple(values)


def current_session_user_id() -> int | None:
    user_id = session.get("user_id")
    if user_id is None:
        return None
    with db_cursor() as cur:
        cur.execute(
            "SELECT session_version FROM users WHERE id = %s;",
            (user_id,),
        )
        row = cur.fetchone()
    if row is None or row[0] != session.get("session_version"):
        session.clear()
        return None
    return user_id


def _json_body() -> dict:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def _conflict(cur, email: str, nickname: str) -> str | None:
    cur.execute(
        "SELECT email, nickname FROM users WHERE email = %s OR nickname = %s;",
        (email, nickname),
    )
    rows = cur.fetchall()
    if any(row[0] == email or row[1] == nickname for row in rows):
        return "E-mail ou nickname já está em uso."
    return None


def _insert_user(cur, email: str, nickname: str, password_hash: str) -> int:
    cur.execute(
        "INSERT INTO users (email, nickname, password_hash) VALUES (%s, %s, %s) RETURNING id;",
        (email, nickname, password_hash),
    )
    row = cur.fetchone()
    if row is None:
        raise RuntimeError("O INSERT RETURNING não devolveu linha.")
    return row[0]


@auth_bp.post("/api/auth/signup")
@auth_bp.response(201, UserSchema, description="Conta criada e sessão aberta.")
@auth_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="Campo ausente, fora do tipo ou inválido.",
)
@auth_bp.alt_response(
    409,
    schema=ErrorResponseSchema,
    success=True,
    description="E-mail ou nickname já em uso.",
)
@auth_bp.doc(
    summary="Criar conta e abrir sessão",
    description=(
        "Não exige chave de API nem sessão. Cria a conta e abre uma sessão no cookie."
    ),
    requestBody=SIGNUP_REQUEST_BODY,
)
@limiter.limit("3 per hour")
def signup():
    fields = _text_fields(_json_body(), "email", "nickname", "password")
    if fields is None:
        return jsonify({"error": "Os campos email, nickname e password precisam ser textos."}), 400
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
        return jsonify({"error": "E-mail ou nickname já está em uso."}), 409
    session["user_id"] = user_id
    session["session_version"] = 0
    return {"id": user_id, "email": email, "nickname": nickname}, 201


@auth_bp.post("/api/auth/login")
@auth_bp.response(200, UserSchema, description="Sessão aberta.")
@auth_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description=f"Mensagem genérica: {INVALID_CREDENTIALS}.",
)
@auth_bp.doc(
    summary="Entrar",
    description=(
        "Não exige chave de API nem sessão. Autentica por e-mail e senha e abre "
        "uma sessão no cookie."
    ),
    requestBody=LOGIN_REQUEST_BODY,
)
@limiter.limit("5 per minute", key_func=login_rate_key)
def login():
    fields = _text_fields(_json_body(), "email", "password")
    if fields is None:
        return jsonify({"error": INVALID_CREDENTIALS}), 401
    email, password = fields
    if validate_email(email) is not None:
        return jsonify({"error": INVALID_CREDENTIALS}), 401
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, email, nickname, password_hash, session_version "
            "FROM users WHERE email = %s;",
            (normalize_email(email),),
        )
        row = cur.fetchone()
    if row is None:
        user_id, email, nickname, password_hash, session_version = (
            None,
            "",
            "",
            _DUMMY_PASSWORD_HASH,
            0,
        )
    else:
        user_id, email, nickname, password_hash, session_version = row
    if not check_password_hash(password_hash, password):
        return jsonify({"error": INVALID_CREDENTIALS}), 401
    session["user_id"] = user_id
    session["session_version"] = session_version
    return {"id": user_id, "email": email, "nickname": nickname}, 200


@auth_bp.post("/api/auth/logout")
@auth_bp.alt_response(204, success=True, description="Sessão encerrada, sem corpo.")
@auth_bp.doc(
    summary="Sair",
    description="Exige o cookie de sessão; encerra a sessão e responde 204.",
    security=[{"cookieAuth": []}],
)
def logout():
    user_id = session.get("user_id")
    if user_id is not None:
        with db_cursor() as cur:
            cur.execute(
                "UPDATE users SET session_version = session_version + 1 WHERE id = %s;",
                (user_id,),
            )
    session.clear()
    return "", 204


@auth_bp.get("/api/me")
@auth_bp.response(200, UserSchema, description="Usuário da sessão atual.")
@auth_bp.response(204, description="Não há uma sessão ativa.")
@auth_bp.doc(
    summary="Usuário autenticado",
    description=(
        "Não exige chave. Retorna os dados do usuário da sessão; sem sessão, "
        "responde 204."
    ),
)
def me():
    user_id = current_session_user_id()
    if user_id is None:
        return "", 204
    with db_cursor() as cur:
        cur.execute(
            "SELECT email, nickname FROM users WHERE id = %s;",
            (user_id,),
        )
        row = cur.fetchone()
    if row is None:
        session.clear()
        return "", 204
    return {"id": user_id, "email": row[0], "nickname": row[1]}, 200
