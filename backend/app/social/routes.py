import base64
import binascii
import re

import psycopg2
from flask import Response, jsonify, request, session
from flask_smorest import Blueprint

from auth.validators import normalize_email, validate_email, validate_nickname
from schemas import ErrorResponseSchema

from . import handlers
from . import store
from .avatar import validate_avatar
from .handlers import conversation_id
from .schemas import (
    ChatBlockSchema,
    ChatHistorySchema,
    CharacterSchema,
    FriendSchema,
    ProfileSchema,
    ProfileUpdateSchema,
)

UNAUTHENTICATED = "Você não está logado."
SELF_BLOCK_ERROR = "Você não pode bloquear sua própria conta."
USER_NOT_FOUND = "Usuário não encontrado."
PENDING_INVITATION_MISSING = "Não há convite pendente desse usuário para você."

MAX_AVATAR_DATA_URL_CHARS = 800_000
AVATAR_DATA_URL_RE = re.compile(r"^data:(image/[\w.+-]+);base64,(.+)$", re.DOTALL)
ALLOWED_AVATAR_CONTENT_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}

social_bp = Blueprint("social", __name__, description="Perfil, amigos e chat.")

PROFILE_UPDATE_REQUEST_BODY = {
    "description": "Substitui o e-mail e o apelido do perfil.",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["email", "nickname"],
                "properties": {
                    "email": {
                        "type": "string",
                        "format": "email",
                        "description": "Novo e-mail de acesso.",
                    },
                    "nickname": {
                        "type": "string",
                        "pattern": "^[A-Za-z0-9_]+$",
                        "minLength": 3,
                        "maxLength": 20,
                        "description": "Novo apelido público: letras, números e _.",
                    },
                },
            },
            "example": {"email": "ana@example.com", "nickname": "ana"},
        }
    },
}

PROFILE_AVATAR_REQUEST_BODY = {
    "description": "Foto do usuário como data URL de imagem em base64 (sobe até 600 KB).",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["avatarDataUrl"],
                "properties": {
                    "avatarDataUrl": {
                        "type": "string",
                        "description":
                            "Foto em formato data URL, ex.: data:image/png;base64,AAAA.",
                    },
                },
            },
            "example": {"avatarDataUrl": "data:image/png;base64,iVBORw0KGgo="},
        }
    },
}

CHARACTER_REQUEST_BODY = {
    "description": "Identificador do personagem escolhido para a integração com o Babylon.",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["character"],
                "properties": {
                    "character": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Nome ou identificador do personagem.",
                    },
                },
            },
            "example": {"character": "character"},
        }
    },
}

FRIEND_ADD_REQUEST_BODY = {
    "description": "Convite pelo apelido exato do usuário que você quer adicionar.",
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["nickname"],
                "properties": {
                    "nickname": {
                        "type": "string",
                        "description": "Apelido da pessoa alvo, digitado por completo.",
                    },
                },
            },
            "example": {"nickname": "bia"},
        }
    },
}

def _json_body() -> dict:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}

def _session_user_id() -> int | None:
    user_id = session.get("user_id")
    return None if user_id is None else user_id

def _unauthorized():
    return jsonify({"error": UNAUTHENTICATED}), 401

def _discard_session_of_missing_user(user_id: int) -> bool:
    if store.get_user_profile(user_id) is not None:
        return False
    session.clear()
    return True

def _block_target_error(current_user_id: int, target_user_id: int) -> tuple[str, int] | None:
    if target_user_id == current_user_id:
        return SELF_BLOCK_ERROR, 400
    if store.get_user_profile(target_user_id) is None:
        return USER_NOT_FOUND, 404
    return None

def _friend_payload(
    other_id: int, nickname: str, avatar_ts, status: str, relation: str
) -> dict:
    return {
        "id": other_id,
        "nickname": nickname,
        "avatarUrl": store.avatar_url(other_id, avatar_ts),
        "online": handlers.user_online(other_id),
        "status": status,
        "relation": relation,
    }

def _decode_avatar_data_url(raw) -> tuple[str, bytes] | tuple[None, str]:
    if not isinstance(raw, str):
        return None, "Envie o campo avatarDataUrl como texto (data URL de imagem)."
    match = AVATAR_DATA_URL_RE.match(raw)
    if match is None:
        return None, (
            "avatarDataUrl precisa ser um data URL de imagem em base64 "
            "(ex.: data:image/png;base64,AAAA)."
        )
    content_type = match.group(1)
    if content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        return None, "O avatar deve ser PNG, JPEG, GIF ou WebP."
    if len(raw) > MAX_AVATAR_DATA_URL_CHARS:
        return None, "O avatar excede o limite de 600 KB."
    try:
        return content_type, base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError):
        return None, "O conteúdo do avatar não é um base64 válido."

@social_bp.get("/api/profile")
@social_bp.response(
    200, ProfileSchema, description="Perfil público de qualquer usuário."
)
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sem sessão nem chave de API válida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="O parâmetro id está ausente ou não é um número.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="Ninguém cadastrado com esse id.",
)
@social_bp.doc(
    summary="Ler perfil público",
    description=(
        "Aceita uma chave de API ou uma sessão autenticada. Sem sessão, envie "
        "X-API-Key. Retorna os dados públicos do perfil informado."
    ),
    security=[{"cookieAuth": []}, {"apiKeyAuth": []}],
    parameters=[
        {
            "name": "id",
            "in": "query",
            "required": True,
            "schema": {"type": "integer"},
            "description": "Id do usuário.",
            "example": 2,
        }
    ],
)
def get_profile():
    try:
        user_id = int(request.args.get("id"))
    except (TypeError, ValueError):
        return jsonify({"error": "O id informado não é um número."}), 400
    profile = store.get_user_profile(user_id)
    if profile is None:
        return jsonify({"error": "Usuário não encontrado para o id informado."}), 404
    return {
        "id": user_id,
        "nickname": profile[0],
        "avatarUrl": store.avatar_url(user_id, profile[1]),
    }

@social_bp.put("/api/profile")
@social_bp.response(200, ProfileUpdateSchema, description="Perfil atualizado.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="O e-mail ou apelido informado é inválido.",
)
@social_bp.alt_response(
    409,
    schema=ErrorResponseSchema,
    success=True,
    description="O e-mail ou apelido já está em uso.",
)
@social_bp.doc(
    summary="Atualizar o próprio perfil",
    description=(
        "Exige o cookie de sessão. A chave de API sozinha não autoriza a alteração. "
        "Substitui o e-mail e o apelido do usuário autenticado."
    ),
    requestBody=PROFILE_UPDATE_REQUEST_BODY,
    security=[{"cookieAuth": []}],
)
def update_profile():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    body = _json_body()
    email = body.get("email")
    nickname = body.get("nickname")
    if not isinstance(email, str) or not isinstance(nickname, str):
        return jsonify({"error": "Informe um e-mail e um apelido válidos."}), 400
    email = email.strip()
    nickname = nickname.strip()
    validation_error = validate_email(email)
    if validation_error is not None:
        return jsonify({"error": validation_error}), 400
    validation_error = validate_nickname(nickname)
    if validation_error is not None:
        return jsonify({"error": validation_error}), 400
    try:
        email, nickname, avatar_ts = store.update_profile(
            user_id, normalize_email(email), nickname
        )
    except psycopg2.IntegrityError:
        return jsonify({"error": "Este e-mail ou apelido já está em uso."}), 409
    except LookupError:
        session.clear()
        return _unauthorized()
    handlers.broadcast_friends()
    return {
        "id": user_id,
        "email": email,
        "nickname": nickname,
        "avatarUrl": store.avatar_url(user_id, avatar_ts),
    }

@social_bp.get("/api/profile/character")
@social_bp.response(200, CharacterSchema, description="Personagem escolhido pelo usuário.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.doc(
    summary="Ler personagem do Babylon",
    description=(
        "Exige o cookie de sessão e retorna o identificador do personagem escolhido "
        "pelo usuário para a integração com o Babylon."
    ),
    security=[{"cookieAuth": []}],
)
def get_character():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    try:
        character = store.get_character(user_id)
    except LookupError:
        session.clear()
        return _unauthorized()
    return {"character": character}


@social_bp.put("/api/profile/character")
@social_bp.response(200, CharacterSchema, description="Personagem escolhido salvo.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="O campo character está ausente, vazio ou fora do limite.",
)
@social_bp.doc(
    summary="Escolher personagem do Babylon",
    description=(
        "Exige o cookie de sessão e salva o identificador do personagem escolhido "
        "pelo usuário para a integração com o Babylon."
    ),
    requestBody=CHARACTER_REQUEST_BODY,
    security=[{"cookieAuth": []}],
)
def update_character():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    character = _json_body().get("character")
    if not isinstance(character, str):
        return jsonify({"error": "Informe o campo character como texto."}), 400
    character = character.strip()
    if not character:
        return jsonify({"error": "O campo character não pode ser vazio."}), 400
    if len(character) > 100:
        return jsonify(
            {"error": "O campo character deve ter no máximo 100 caracteres."}
        ), 400
    try:
        character = store.set_character(user_id, character)
    except LookupError:
        session.clear()
        return _unauthorized()
    return {"character": character}

@social_bp.post("/api/profile/avatar")
@social_bp.response(200, ProfileSchema, description="Foto gravada e endereço novo devolvido.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="O campo avatarDataUrl veio ausente, fora do formato ou acima do limite de 600 KB.",
)
@social_bp.doc(
    summary="Enviar a própria foto",
    description=(
        "Exige o cookie de sessão. A chave de API sozinha não autoriza a alteração. "
        "Grava a foto do usuário autenticado."
    ),
    requestBody=PROFILE_AVATAR_REQUEST_BODY,
    security=[{"cookieAuth": []}],
)
def post_avatar():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    if _discard_session_of_missing_user(user_id):
        return jsonify({"error": UNAUTHENTICATED}), 401
    content_type, data = _decode_avatar_data_url(_json_body().get("avatarDataUrl"))
    if content_type is None:
        return jsonify({"error": data}), 400
    validation_error = validate_avatar(content_type, data)
    if validation_error is not None:
        return jsonify({"error": validation_error}), 400
    store.set_avatar(user_id, content_type, data)
    profile = store.get_user_profile(user_id)
    handlers.broadcast_friends()
    return {
        "id": user_id,
        "nickname": profile[0] if profile else "",
        "avatarUrl": store.avatar_url(user_id, profile[1]),
    }

@social_bp.delete("/api/profile/avatar")
@social_bp.response(200, ProfileSchema, description="Foto removida do perfil.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.doc(
    summary="Remover a própria foto",
    description=(
        "Exige o cookie de sessão. A chave de API sozinha não autoriza a alteração."
    ),
    security=[{"cookieAuth": []}],
)
def delete_avatar():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    if _discard_session_of_missing_user(user_id):
        return jsonify({"error": UNAUTHENTICATED}), 401
    store.delete_avatar(user_id)
    profile = store.get_user_profile(user_id)
    handlers.broadcast_friends()
    return {
        "id": user_id,
        "nickname": profile[0] if profile else "",
        "avatarUrl": None,
    }

@social_bp.get("/api/profile/avatar/<int:user_id>")
@social_bp.response(
    200,
    {"type": "string", "format": "binary"},
    description="Bytes da foto, no Content-Type do upload.",
)
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sem sessão nem chave de API válida.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="Nenhum avatar gravado para esse usuário.",
)
@social_bp.doc(
    summary="Ler a foto de um usuário",
    description=(
        "Aceita uma chave de API ou uma sessão autenticada. Sem sessão, envie "
        "X-API-Key. Retorna o avatar público do usuário informado."
    ),
    security=[{"cookieAuth": []}, {"apiKeyAuth": []}],
)
def get_avatar(user_id: int):
    avatar = store.get_avatar(user_id)
    if avatar is None:
        return jsonify({"error": "Este usuário ainda não tem avatar."}), 404
    content_type, data, _ = avatar
    return Response(
        data,
        mimetype=content_type,
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )

def _conversation_history(rows: list[dict]) -> list[dict]:
    conversations: dict[str, dict] = {}
    for row in rows:
        conv_id = conversation_id(row["senderId"], row["recipientId"])
        message = {
            key: row[key]
            for key in ("id", "userId", "nickname", "avatarUrl", "text", "createdAt")
        }
        message["otherUserId"] = row["peerId"]
        message["conversationId"] = conv_id
        entry = conversations.setdefault(
            conv_id,
            {
                "conversationId": conv_id,
                "otherUserId": row["peerId"],
                "otherNickname": row["peerNickname"],
                "messages": [],
            },
        )
        entry["messages"].append(message)
    return list(conversations.values())

@social_bp.get("/api/chat/history")
@social_bp.response(
    200, ChatHistorySchema, description="Histórico do chat público e das conversas privadas."
)
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.doc(
    summary="Histórico de chat",
    description=(
        "Traz todas as mensagens da sala pública e as conversas privadas do "
        "usuário da sessão; apelidos e fotos resolvidos no momento da leitura. "
        "Exige o cookie de sessão; a chave de API sozinha não dá acesso ao chat."
    ),
    security=[{"cookieAuth": []}],
)
def get_chat_history():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    return {
        "global": store.global_rows(),
        "conversations": _conversation_history(store.private_rows(user_id)),
        "blockedUserIds": store.blocked_user_ids(user_id),
        "blockingUserIds": store.blocking_user_ids(user_id),
    }


@social_bp.post("/api/chat/blocks/<int:user_id>")
@social_bp.response(200, ChatBlockSchema, description="Usuário bloqueado.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="A conta atual não pode ser bloqueada.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="O usuário informado não existe.",
)
@social_bp.doc(
    summary="Bloquear mensagens privadas de um usuário",
    description="Exige o cookie de sessão. A chave de API sozinha não autoriza esta ação.",
    security=[{"cookieAuth": []}],
)
def post_chat_block(user_id: int):
    current_user_id = _session_user_id()
    if current_user_id is None:
        return _unauthorized()
    error = _block_target_error(current_user_id, user_id)
    if error is not None:
        return jsonify({"error": error[0]}), error[1]
    store.block_user(current_user_id, user_id)
    return {"status": "blocked", "userId": user_id}


@social_bp.delete("/api/chat/blocks/<int:user_id>")
@social_bp.response(200, ChatBlockSchema, description="Usuário desbloqueado.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="A conta atual não pode ser bloqueada.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="O usuário informado não existe.",
)
@social_bp.doc(
    summary="Desbloquear mensagens privadas de um usuário",
    description="Exige o cookie de sessão. A chave de API sozinha não autoriza esta ação.",
    security=[{"cookieAuth": []}],
)
def delete_chat_block(user_id: int):
    current_user_id = _session_user_id()
    if current_user_id is None:
        return _unauthorized()
    error = _block_target_error(current_user_id, user_id)
    if error is not None:
        return jsonify({"error": error[0]}), error[1]
    store.unblock_user(current_user_id, user_id)
    return {"status": "unblocked", "userId": user_id}

@social_bp.post("/api/friends")
@social_bp.response(201, FriendSchema, description="Convite enviado.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    400,
    schema=ErrorResponseSchema,
    success=True,
    description="O nickname veio em branco ou você tentou se adicionar.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="Ninguém cadastrado com esse nickname.",
)
@social_bp.alt_response(
    409,
    schema=ErrorResponseSchema,
    success=True,
    description="Já existe um convite entre vocês ou vocês já são amigos.",
)
@social_bp.doc(
    summary="Enviar convite de amizade",
    description=(
        "Exige o cookie de sessão. A chave de API sozinha não autoriza esta ação. "
        "Cria um convite para a pessoa do nickname informado."
    ),
    requestBody=FRIEND_ADD_REQUEST_BODY,
    security=[{"cookieAuth": []}],
)
def add_friend():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    nickname = _json_body().get("nickname")
    if not isinstance(nickname, str) or not nickname.strip():
        return jsonify({"error": "Informe o nickname do amigo que você quer adicionar."}), 400
    nickname = nickname.strip()
    validation_error = validate_nickname(nickname)
    if validation_error is not None:
        return jsonify({"error": validation_error}), 400
    friend = store.find_user_by_nickname(nickname)
    if friend is None:
        return jsonify({"error": "Nenhum usuário encontrado com esse nickname."}), 404
    if friend[0] == user_id:
        return jsonify({"error": "Você não pode se adicionar como amigo."}), 400
    try:
        store.insert_friend_edge(user_id, friend[0])
    except psycopg2.IntegrityError:
        return jsonify(
            {"error": "Já existe um convite entre vocês ou vocês já são amigos."}
        ), 409
    handlers.broadcast_friends()
    return _friend_payload(
        friend[0], friend[1], friend[2], "pending", "outgoing"
    ), 201

@social_bp.delete("/api/friends/<int:friend_id>")
@social_bp.alt_response(
    204, success=True, description="Vínculo encerrado; repetir a chamada não muda nada."
)
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.doc(
    summary="Remover amigo",
    description=(
        "Quebra o vínculo entre você e o id informado, em qualquer direção ou "
        "situação. Exige o cookie de sessão; a chave de API sozinha não autoriza "
        "esta ação. Sem vínculo, responde 204."
    ),
    security=[{"cookieAuth": []}],
)
def remove_friend(friend_id: int):
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    store.delete_edges(user_id, friend_id)
    handlers.broadcast_friends()
    return "", 204

@social_bp.post("/api/friends/<int:from_id>/accept")
@social_bp.response(200, FriendSchema, description="Amizade confirmada.")
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="Não há convite pendente desse usuário para você.",
)
@social_bp.doc(
    summary="Aceitar convite",
    description=(
        "Exige o cookie de sessão. A chave de API sozinha não autoriza esta ação. "
        "Confirma o convite pendente de from_id."
    ),
    security=[{"cookieAuth": []}],
)
def accept_friend(from_id: int):
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    if not store.accept_edge(from_id, user_id):
        return jsonify({"error": PENDING_INVITATION_MISSING}), 404
    profile = store.get_user_profile(from_id)
    handlers.broadcast_friends()
    if profile is None:
        return _friend_payload(from_id, "", None, "accepted", "friend")
    return _friend_payload(from_id, profile[0], profile[1], "accepted", "friend")

@social_bp.post("/api/friends/<int:from_id>/reject")
@social_bp.alt_response(
    204, success=True, description="Convite descartado, sem corpo na resposta."
)
@social_bp.alt_response(
    401,
    schema=ErrorResponseSchema,
    success=True,
    description="Sessão ausente, expirada ou inválida.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="Não há convite pendente desse usuário para você.",
)
@social_bp.doc(
    summary="Rejeitar convite",
    description=(
        "Exige o cookie de sessão. A chave de API sozinha não autoriza esta ação. "
        "Recusa o convite pendente de from_id."
    ),
    security=[{"cookieAuth": []}],
)
def reject_friend(from_id: int):
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    if not store.reject_edge(from_id, user_id):
        return jsonify({"error": PENDING_INVITATION_MISSING}), 404
    handlers.broadcast_friends()
    return "", 204
