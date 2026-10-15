import base64
import binascii
import re

import psycopg2
from flask import Response, jsonify, request, session
from flask_smorest import Blueprint

from auth.validators import validate_nickname
from schemas import ErrorResponseSchema

from . import handlers
from . import store
from .handlers import conversation_id
from .schemas import (
    ChatHistorySchema,
    FriendSchema,
    ProfileSchema,
    ProfileUpdateSchema,
)

UNAUTHENTICATED = "Você não está logado."

AVATAR_MAX_CHARS = 800_000
AVATAR_DATA_URL_RE = re.compile(r"^data:(image/[\w.+-]+);base64,(.+)$", re.DOTALL)

social_bp = Blueprint("social", __name__, description="Perfil, amigos e chat.")

PROFILE_UPDATE_REQUEST_BODY = {
    "description": (
        "Campos id e email do corpo são recebidos e ignorados: quem vale é a sessão."
    ),
    "required": True,
    "content": {
        "application/json": {
            "schema": {
                "type": "object",
                "required": ["nickname"],
                "properties": {
                    "nickname": {
                        "type": "string",
                        "pattern": "^[A-Za-z0-9_]+$",
                        "minLength": 3,
                        "maxLength": 20,
                        "description": "Novo apelido público: letras, números e _.",
                    },
                },
            },
            "example": {"nickname": "ana2"},
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

@social_bp.get("/api/profile")
@social_bp.response(
    200, ProfileSchema, description="Perfil público de qualquer usuário."
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
    description="Lê o perfil de qualquer usuário pelo id; rota pública, não exige sessão.",
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

@social_bp.patch("/api/profile")
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
    description="O novo nickname veio ausente ou fora das regras de tamanho e caracteres.",
)
@social_bp.alt_response(
    409,
    schema=ErrorResponseSchema,
    success=True,
    description="Alguém já usa esse nickname.",
)
@social_bp.doc(
    summary="Atualizar o próprio perfil",
    description=(
        "Troca o apelido do usuário da sessão. A resposta traz o e-mail atual; "
        "não existe troca de e-mail pela API."
    ),
    requestBody=PROFILE_UPDATE_REQUEST_BODY,
    security=[{"cookieAuth": []}],
)
def patch_profile():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    nickname = _json_body().get("nickname")
    if not isinstance(nickname, str):
        return jsonify({"error": "Informe o novo nickname."}), 400
    validation_error = validate_nickname(nickname)
    if validation_error is not None:
        return jsonify({"error": validation_error}), 400
    try:
        email, avatar_ts = store.update_nickname(user_id, nickname)
    except psycopg2.IntegrityError:
        return jsonify({"error": "Este nickname já está em uso por outro usuário."}), 409
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
    description="Grava os bytes da foto no banco e devolve o endereço com a versão nova.",
    requestBody=PROFILE_AVATAR_REQUEST_BODY,
    security=[{"cookieAuth": []}],
)
def post_avatar():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    raw = _json_body().get("avatarDataUrl")
    if not isinstance(raw, str):
        return jsonify(
            {"error": "Envie o campo avatarDataUrl como texto (data URL de imagem)."}
        ), 400
    match = AVATAR_DATA_URL_RE.match(raw)
    if match is None:
        return jsonify(
            {"error": "avatarDataUrl precisa ser um data URL de imagem em base64 "
                      "(ex.: data:image/png;base64,AAAA)."}
        ), 400
    if len(raw) > AVATAR_MAX_CHARS:
        return jsonify({"error": "O avatar excede o limite de 600 KB."}), 400
    try:
        data = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError):
        return jsonify(
            {"error": "O conteúdo do avatar não é um base64 válido."}
        ), 400
    store.set_avatar(user_id, match.group(1), data)
    profile = store.get_user_profile(user_id)
    handlers.broadcast_friends()
    return {
        "id": user_id,
        "nickname": profile[0] if profile else "",
        "avatarUrl": store.avatar_url(user_id, profile[1]),
    }

@social_bp.get("/api/profile/avatar/<int:user_id>")
@social_bp.response(
    200,
    {"type": "string", "format": "binary"},
    description="Bytes da foto, no Content-Type do upload.",
)
@social_bp.alt_response(
    404,
    schema=ErrorResponseSchema,
    success=True,
    description="Nenhum avatar gravado para esse usuário.",
)
@social_bp.doc(
    summary="Ler a foto de um usuário",
    description="Devolve os bytes gravados no upload; rota pública, não exige sessão.",
)
def get_avatar(user_id: int):
    avatar = store.get_avatar(user_id)
    if avatar is None:
        return jsonify({"error": "Este usuário ainda não tem avatar."}), 404
    content_type, data, _ = avatar
    return Response(
        data,
        mimetype=content_type,
        headers={"Cache-Control": "no-cache"},
    )

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
        "usuário da sessão; apelidos e fotos resolvidos no momento da leitura."
    ),
    security=[{"cookieAuth": []}],
)
def get_chat_history():
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    conversations: dict[str, dict] = {}
    for row in store.private_rows(user_id):
        conv_id = conversation_id(row["senderId"], row["recipientId"])
        message = {
            key: row[key]
            for key in ("id", "userId", "nickname", "avatarUrl", "text", "createdAt")
        }
        message["otherUserId"] = row["peerId"]
        message["conversationId"] = conv_id
        entry = conversations.get(conv_id)
        if entry is None:
            entry = {
                "conversationId": conv_id,
                "otherUserId": row["peerId"],
                "otherNickname": row["peerNickname"],
                "messages": [],
            }
            conversations[conv_id] = entry
        entry["messages"].append(message)
    return {"global": store.global_rows(), "conversations": list(conversations.values())}

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
    description="Cria um convite em espera (pending) para a pessoa do nickname informado.",
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
    return {
        "id": friend[0],
        "nickname": friend[1],
        "avatarUrl": store.avatar_url(friend[0], friend[2]),
        "online": handlers.user_online(friend[0]),
        "status": "pending",
        "relation": "outgoing",
    }, 201

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
        "situação. Sem vínculo, continua devolvendo 204."
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
    description="Confirma o convite pendente de from_id; a relação passa a ser amizade.",
    security=[{"cookieAuth": []}],
)
def accept_friend(from_id: int):
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    if not store.accept_edge(from_id, user_id):
        return jsonify({"error": "Não há convite pendente desse usuário para você."}), 404
    profile = store.get_user_profile(from_id)
    handlers.broadcast_friends()
    return {
        "id": from_id,
        "nickname": profile[0] if profile else "",
        "avatarUrl": store.avatar_url(from_id, profile[1]) if profile else None,
        "online": handlers.user_online(from_id),
        "status": "accepted",
        "relation": "friend",
    }

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
    description="Recusa e descarta o convite pendente de from_id para o usuário da sessão.",
    security=[{"cookieAuth": []}],
)
def reject_friend(from_id: int):
    user_id = _session_user_id()
    if user_id is None:
        return _unauthorized()
    if not store.reject_edge(from_id, user_id):
        return jsonify({"error": "Não há convite pendente desse usuário para você."}), 404
    handlers.broadcast_friends()
    return "", 204
