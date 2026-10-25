import threading
from collections.abc import Callable

from flask import request, session

from . import store

SEM_AMIZADE_ACEITA = "Não é possível enviar mensagem privada: vocês ainda não são amigos."
USUARIO_BLOQUEADO = "Não é possível enviar mensagem: existe um bloqueio entre as contas."

identities: dict[str, tuple[int, str]] = {}
_online: dict[int, int] = {}
_state_lock = threading.Lock()
_socketio = None

def _request_sid() -> str:
    return getattr(request, "sid", "")

def conversation_id(a: int, b: int) -> str:
    return f"{min(a, b)}:{max(a, b)}"

def user_online(user_id: int) -> bool:
    with _state_lock:
        return _online.get(user_id, 0) > 0

def unique_user_ids() -> set[int]:
    with _state_lock:
        return {user_id for user_id, _ in identities.values()}

def friends_update_payload(user_id: int) -> list[dict]:
    rows = store.friend_rows(user_id)
    with _state_lock:
        online_ids = {uid for uid, count in _online.items() if count > 0}
    payload = []
    for other_id, status, requester_id, nickname, avatar_ts in rows:
        pending = status == "pending"
        if pending and requester_id == user_id:
            relation = "outgoing"
        elif pending:
            relation = "incoming"
        else:
            relation = "friend"
        payload.append({
            "id": other_id,
            "nickname": nickname,
            "avatarUrl": store.avatar_url(other_id, avatar_ts),
            "online": other_id in online_ids,
            "status": status,
            "relation": relation,
        })
    return payload

def broadcast_friends() -> None:
    if _socketio is None:
        return
    for user_id in sorted(unique_user_ids()):
        _socketio.emit(
            "friends:update", friends_update_payload(user_id), room=f"user:{user_id}"
        )

def _emit_to_user(user_id: int, event: str, payload: dict) -> None:
    _socketio.emit(event, payload, room=f"user:{user_id}")

def register_social_handlers(socketio, matchmaker) -> Callable[[str], None]:
    global _socketio
    _socketio = socketio
    @socketio.on("connect")
    def on_connect(auth=None):
        sid = _request_sid()
        user_id = session.get("user_id")
        if user_id is None:
            return False
        profile = store.get_user_profile(user_id)
        if profile is None:
            return False
        nickname = profile[0]
        with _state_lock:
            identities[sid] = (user_id, nickname)
            _online[user_id] = _online.get(user_id, 0) + 1
            became_online = _online[user_id] == 1
        socketio.server.enter_room(sid, f"user:{user_id}")
        for invitation in matchmaker.game_invitations_for_user(user_id):
            sender = store.get_user_profile(invitation["senderId"])
            recipient = store.get_user_profile(invitation["recipientId"])
            if sender is None or recipient is None:
                continue
            invitation["senderNickname"] = sender[0]
            invitation["recipientNickname"] = recipient[0]
            event = (
                "chat:game:invite:update"
                if invitation["status"] == "accepted"
                or invitation["senderId"] == user_id
                else "chat:game:invite"
            )
            _emit_to_user(user_id, event, invitation)
        if became_online:
            broadcast_friends()
        else:
            _emit_to_user(user_id, "friends:update", friends_update_payload(user_id))
        return None
    def _int_field(raw, name: str) -> int | None:
        if not isinstance(raw, dict):
            return None
        value = raw.get(name)
        if isinstance(value, bool) or not isinstance(value, int):
            return None
        return value
    def _is_accepted_friend(a: int, b: int) -> bool:
        edge = store.get_friend_edge(a, b)
        return edge is not None and edge[1] == "accepted"
    @socketio.on("chat:send")
    def on_chat_send(raw=None):
        identity = identities.get(_request_sid())
        if identity is None or not isinstance(raw, dict):
            return
        text = raw.get("text")
        if not isinstance(text, str):
            return
        text = text.strip()
        if not text:
            return
        message = store.insert_message(identity[0], None, text)
        socketio.emit("chat:message", message)
    @socketio.on("chat:private:send")
    def on_chat_private_send(raw=None):
        identity = identities.get(_request_sid())
        if identity is None or not isinstance(raw, dict):
            return
        other_id = _int_field(raw, "otherUserId")
        if other_id is None:
            return
        text = raw.get("text")
        if not isinstance(text, str):
            return
        text = text.strip()
        if not text:
            return
        user_id = identity[0]
        if not _is_accepted_friend(user_id, other_id):
            socketio.emit(
                "chat:private:error", {"message": SEM_AMIZADE_ACEITA}, room=_request_sid()
            )
            return
        if store.is_blocked_between(user_id, other_id):
            socketio.emit(
                "chat:private:error", {"message": USUARIO_BLOQUEADO}, room=_request_sid()
            )
            return
        message = store.insert_message(user_id, other_id, text)
        message["otherUserId"] = other_id
        message["conversationId"] = conversation_id(user_id, other_id)
        _emit_to_user(user_id, "chat:private:message", message)
        _emit_to_user(other_id, "chat:private:message", message)
    @socketio.on("chat:private:typing")
    def on_chat_private_typing(raw=None):
        identity = identities.get(_request_sid())
        if identity is None or not isinstance(raw, dict):
            return
        other_id = _int_field(raw, "otherUserId")
        if other_id is None:
            return
        user_id, nickname = identity
        if not _is_accepted_friend(user_id, other_id) or store.is_blocked_between(
            user_id, other_id
        ):
            return
        _emit_to_user(
            other_id,
            "chat:private:typing",
            {
                "userId": user_id,
                "nickname": nickname,
                "conversationId": conversation_id(user_id, other_id),
                "isTyping": raw.get("isTyping") is True,
            },
        )
    @socketio.on("chat:private:read")
    def on_chat_private_read(raw=None):
        identity = identities.get(_request_sid())
        if identity is None or not isinstance(raw, dict):
            return
        other_id = _int_field(raw, "otherUserId")
        last_message_id = raw.get("lastMessageId")
        if other_id is None or not isinstance(last_message_id, str) or not last_message_id:
            return
        user_id = identity[0]
        if not _is_accepted_friend(user_id, other_id) or store.is_blocked_between(
            user_id, other_id
        ):
            return
        _emit_to_user(
            other_id,
            "chat:private:read",
            {
                "userId": user_id,
                "conversationId": conversation_id(user_id, other_id),
                "lastMessageId": last_message_id,
            },
        )

    @socketio.on("chat:game:invite")
    def on_chat_game_invite(raw=None):
        identity = identities.get(_request_sid())
        if identity is None:
            return
        other_id = _int_field(raw, "otherUserId")
        if other_id is None or other_id == identity[0]:
            return
        if not _is_accepted_friend(identity[0], other_id):
            socketio.emit(
                "chat:private:error", {"message": SEM_AMIZADE_ACEITA}, room=_request_sid()
            )
            return
        if store.is_blocked_between(identity[0], other_id):
            socketio.emit(
                "chat:private:error", {"message": USUARIO_BLOQUEADO}, room=_request_sid()
            )
            return
        other_profile = store.get_user_profile(other_id)
        if other_profile is None:
            return
        invitation_id = matchmaker.create_game_invitation(identity[0], other_id)
        if invitation_id is None:
            socketio.emit(
                "chat:private:error",
                {"message": "Uma das pessoas já está em uma partida ou convite."},
                room=_request_sid(),
            )
            return
        event = {
            "inviteId": invitation_id,
            "senderId": identity[0],
            "senderNickname": identity[1],
            "recipientId": other_id,
            "recipientNickname": other_profile[0],
            "status": "pending",
        }
        _emit_to_user(other_id, "chat:game:invite", event)
        _emit_to_user(identity[0], "chat:game:invite:update", event)

    @socketio.on("chat:game:invite:respond")
    def on_chat_game_invite_respond(raw=None):
        identity = identities.get(_request_sid())
        if identity is None or not isinstance(raw, dict):
            return
        invitation_id = raw.get("inviteId")
        accepted = raw.get("accepted")
        if not isinstance(invitation_id, str) or not isinstance(accepted, bool):
            return
        invitation = matchmaker.game_invitation(invitation_id)
        if invitation is None or invitation["recipientId"] != identity[0]:
            socketio.emit(
                "chat:private:error",
                {"message": "Este convite não está mais disponível."},
                room=_request_sid(),
            )
            return
        if accepted and store.is_blocked_between(
            invitation["senderId"], invitation["recipientId"]
        ):
            socketio.emit(
                "chat:private:error",
                {"message": "Não é possível aceitar um convite entre contas bloqueadas."},
                room=_request_sid(),
            )
            return
        event = matchmaker.respond_game_invitation(
            invitation_id, identity[0], accepted
        )
        if event is None:
            socketio.emit(
                "chat:private:error",
                {"message": "Este convite não está mais disponível."},
                room=_request_sid(),
            )
            return
        sender_profile = store.get_user_profile(event["senderId"])
        recipient_profile = store.get_user_profile(event["recipientId"])
        if sender_profile is None or recipient_profile is None:
            return
        event["senderNickname"] = sender_profile[0]
        event["recipientNickname"] = recipient_profile[0]
        event["status"] = "accepted" if accepted else "declined"
        _emit_to_user(event["senderId"], "chat:game:invite:update", event)
        _emit_to_user(event["recipientId"], "chat:game:invite:update", event)

    @socketio.on("chat:game:invite:cancel")
    def on_chat_game_invite_cancel(raw=None):
        identity = identities.get(_request_sid())
        if identity is None or not isinstance(raw, dict):
            return
        invitation_id = raw.get("inviteId")
        if not isinstance(invitation_id, str):
            return
        event = matchmaker.cancel_game_invitation(invitation_id, identity[0])
        if event is None:
            socketio.emit(
                "chat:private:error",
                {"message": "Este convite não está mais disponível."},
                room=_request_sid(),
            )
            return
        for game_sid in event.pop("socketIds"):
            socketio.emit(
                "game:status", {"state": "opponent_left"}, to=game_sid
            )
        event["status"] = "cancelled"
        sender_profile = store.get_user_profile(event["senderId"])
        recipient_profile = store.get_user_profile(event["recipientId"])
        if sender_profile is None or recipient_profile is None:
            return
        event["senderNickname"] = sender_profile[0]
        event["recipientNickname"] = recipient_profile[0]
        _emit_to_user(event["senderId"], "chat:game:invite:update", event)
        _emit_to_user(event["recipientId"], "chat:game:invite:update", event)
    def handle_disconnect(sid: str) -> None:
        with _state_lock:
            identity = identities.pop(sid, None)
            went_offline = False
            if identity is not None:
                user_id = identity[0]
                _online[user_id] = _online.get(user_id, 0) - 1
                if _online[user_id] <= 0:
                    del _online[user_id]
                    went_offline = True
        if went_offline:
            broadcast_friends()
    return handle_disconnect
