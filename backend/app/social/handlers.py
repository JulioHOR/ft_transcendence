import threading
import time
from collections.abc import Callable
from typing import Any

from flask import request, session

from . import store

NOT_FRIENDS_MESSAGE = "Não é possível enviar mensagem privada: vocês ainda não são amigos."
BLOCKED_USER_MESSAGE = "Não é possível enviar mensagem: existe um bloqueio entre as contas."
TOO_FAST_MESSAGE = "Você está enviando mensagens rápido demais."
MAX_CHAT_MESSAGE_LENGTH = 1000
CHAT_EVENT_INTERVAL_SECONDS = 0.3
MESSAGE_TOO_LONG = f"A mensagem pode ter até {MAX_CHAT_MESSAGE_LENGTH} caracteres."

identities: dict[str, tuple[int, str]] = {}
_online: dict[int, int] = {}
_state_lock = threading.Lock()
_socketio: Any = None
_last_chat_event_at: dict[int, float] = {}


def _request_sid() -> str:
    return getattr(request, "sid", "")


def _current_identity() -> tuple[int, str] | None:
    return identities.get(_request_sid())


def _chat_event_allowed(user_id: int) -> bool:
    with _state_lock:
        now = time.monotonic()
        last_event_at = _last_chat_event_at.get(user_id)
        if (
            last_event_at is not None
            and now - last_event_at < CHAT_EVENT_INTERVAL_SECONDS
        ):
            return False
        _last_chat_event_at[user_id] = now
        return True


def conversation_id(first_user_id: int, second_user_id: int) -> str:
    return f"{min(first_user_id, second_user_id)}:{max(first_user_id, second_user_id)}"


def user_online(user_id: int) -> bool:
    with _state_lock:
        return _online.get(user_id, 0) > 0


def unique_user_ids() -> set[int]:
    with _state_lock:
        return {user_id for user_id, _ in identities.values()}


def _relation_for(status: str, requester_id: int, user_id: int) -> str:
    if status != "pending":
        return "friend"
    return "outgoing" if requester_id == user_id else "incoming"


def friends_update_payload(user_id: int) -> list[dict]:
    rows = store.friend_rows(user_id)
    with _state_lock:
        online_ids = {uid for uid, count in _online.items() if count > 0}
    return [
        {
            "id": other_id,
            "nickname": nickname,
            "avatarUrl": store.avatar_url(other_id, avatar_ts),
            "online": other_id in online_ids,
            "status": status,
            "relation": _relation_for(status, requester_id, user_id),
        }
        for other_id, status, requester_id, nickname, avatar_ts in rows
    ]


def broadcast_friends() -> None:
    if _socketio is None:
        return
    for user_id in sorted(unique_user_ids()):
        _socketio.emit(
            "friends:update", friends_update_payload(user_id), room=f"user:{user_id}"
        )


def _emit_to_user(user_id: int, event: str, payload: dict) -> None:
    _socketio.emit(event, payload, room=f"user:{user_id}")


def _register_online(sid: str, user_id: int, nickname: str) -> bool:
    with _state_lock:
        identities[sid] = (user_id, nickname)
        _online[user_id] = _online.get(user_id, 0) + 1
        return _online[user_id] == 1


def _register_offline(sid: str) -> int | None:
    with _state_lock:
        identity = identities.pop(sid, None)
        if identity is None:
            return None
        user_id = identity[0]
        _online[user_id] = _online.get(user_id, 0) - 1
        if _online[user_id] > 0:
            return None
        del _online[user_id]
        return user_id


def _is_accepted_friend(first_user_id: int, second_user_id: int) -> bool:
    edge = store.get_friend_edge(first_user_id, second_user_id)
    return edge is not None and edge[1] == "accepted"


def _friendship_allows_messages(first_user_id: int, second_user_id: int) -> bool:
    return _is_accepted_friend(
        first_user_id, second_user_id
    ) and not store.is_blocked_between(first_user_id, second_user_id)


def _emit_chat_error(message: str, event_name: str = "chat:private:error") -> None:
    _socketio.emit(event_name, {"message": message}, room=_request_sid())


def enrich_invitation(event: dict) -> bool:
    sender_profile = store.get_user_profile(event["senderId"])
    recipient_profile = store.get_user_profile(event["recipientId"])
    if sender_profile is None or recipient_profile is None:
        return False
    event["senderNickname"] = sender_profile[0]
    event["recipientNickname"] = recipient_profile[0]
    return True


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
        became_online = _register_online(sid, user_id, profile[0])
        socketio.server.enter_room(sid, f"user:{user_id}")
        for invitation in matchmaker.game_invitations_for_user(user_id):
            if not enrich_invitation(invitation):
                continue
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
    def _trimmed_text(raw: dict) -> str | None:
        text = raw.get("text")
        if not isinstance(text, str):
            return None
        stripped = text.strip()
        return stripped or None
    @socketio.on("chat:send")
    def on_chat_send(raw=None):
        identity = _current_identity()
        if identity is None or not isinstance(raw, dict):
            return
        text = _trimmed_text(raw)
        if text is None:
            return
        if len(text) > MAX_CHAT_MESSAGE_LENGTH:
            _emit_chat_error(MESSAGE_TOO_LONG, "chat:error")
            return
        user_id = identity[0]
        if not _chat_event_allowed(user_id):
            _emit_chat_error(TOO_FAST_MESSAGE, "chat:error")
            return
        message = store.insert_message(user_id, None, text)
        blocked = set(store.blocked_user_ids(user_id))
        blocked.update(store.blocking_user_ids(user_id))
        with _state_lock:
            online_ids = list(_online)
        for other_id in online_ids:
            if other_id in blocked:
                continue
            _emit_to_user(other_id, "chat:message", message)
    @socketio.on("chat:private:send")
    def on_chat_private_send(raw=None):
        identity = _current_identity()
        if identity is None or not isinstance(raw, dict):
            return
        other_id = _int_field(raw, "otherUserId")
        if other_id is None:
            return
        text = _trimmed_text(raw)
        if text is None:
            return
        user_id = identity[0]
        if len(text) > MAX_CHAT_MESSAGE_LENGTH:
            _emit_chat_error(MESSAGE_TOO_LONG)
            return
        if not _is_accepted_friend(user_id, other_id):
            _emit_chat_error(NOT_FRIENDS_MESSAGE)
            return
        if store.is_blocked_between(user_id, other_id):
            _emit_chat_error(BLOCKED_USER_MESSAGE)
            return
        if not _chat_event_allowed(user_id):
            _emit_chat_error(TOO_FAST_MESSAGE)
            return
        message = store.insert_message(user_id, other_id, text)
        message["otherUserId"] = other_id
        message["conversationId"] = conversation_id(user_id, other_id)
        _emit_to_user(user_id, "chat:private:message", message)
        _emit_to_user(other_id, "chat:private:message", message)
    @socketio.on("chat:private:typing")
    def on_chat_private_typing(raw=None):
        identity = _current_identity()
        if identity is None or not isinstance(raw, dict):
            return
        other_id = _int_field(raw, "otherUserId")
        if other_id is None:
            return
        user_id, nickname = identity
        if not _friendship_allows_messages(user_id, other_id):
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
        identity = _current_identity()
        if identity is None or not isinstance(raw, dict):
            return
        other_id = _int_field(raw, "otherUserId")
        last_message_id = raw.get("lastMessageId")
        if other_id is None or not isinstance(last_message_id, str) or not last_message_id:
            return
        user_id = identity[0]
        if not _friendship_allows_messages(user_id, other_id):
            return
        if not store.message_in_conversation(user_id, other_id, last_message_id):
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
        identity = _current_identity()
        if identity is None:
            return
        other_id = _int_field(raw, "otherUserId")
        if other_id is None or other_id == identity[0]:
            return
        if not _is_accepted_friend(identity[0], other_id):
            _emit_chat_error(NOT_FRIENDS_MESSAGE)
            return
        if store.is_blocked_between(identity[0], other_id):
            _emit_chat_error(BLOCKED_USER_MESSAGE)
            return
        other_profile = store.get_user_profile(other_id)
        if other_profile is None:
            return
        invitation_id = matchmaker.create_game_invitation(identity[0], other_id)
        if invitation_id is None:
            _emit_chat_error(
                "Uma das pessoas já está em uma partida ou convite."
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
        identity = _current_identity()
        if identity is None or not isinstance(raw, dict):
            return
        invitation_id = raw.get("inviteId")
        accepted = raw.get("accepted")
        if not isinstance(invitation_id, str) or not isinstance(accepted, bool):
            return
        invitation = matchmaker.game_invitation(invitation_id)
        if invitation is None or invitation["recipientId"] != identity[0]:
            _emit_chat_error("Este convite não está mais disponível.")
            return
        if accepted and store.is_blocked_between(
            invitation["senderId"], invitation["recipientId"]
        ):
            _emit_chat_error(
                "Não é possível aceitar um convite entre contas bloqueadas."
            )
            return
        event = matchmaker.respond_game_invitation(
            invitation_id, identity[0], accepted
        )
        if event is None:
            _emit_chat_error("Este convite não está mais disponível.")
            return
        if not enrich_invitation(event):
            return
        event["status"] = "accepted" if accepted else "declined"
        _emit_to_user(event["senderId"], "chat:game:invite:update", event)
        _emit_to_user(event["recipientId"], "chat:game:invite:update", event)

    @socketio.on("chat:game:invite:cancel")
    def on_chat_game_invite_cancel(raw=None):
        identity = _current_identity()
        if identity is None or not isinstance(raw, dict):
            return
        invitation_id = raw.get("inviteId")
        if not isinstance(invitation_id, str):
            return
        event = matchmaker.cancel_game_invitation(invitation_id, identity[0])
        if event is None:
            _emit_chat_error("Este convite não está mais disponível.")
            return
        for waiting_user_id in event.pop("waitingUserIds"):
            _emit_to_user(waiting_user_id, "game:status", {"state": "opponent_left"})
        event["status"] = "cancelled"
        if not enrich_invitation(event):
            return
        _emit_to_user(event["senderId"], "chat:game:invite:update", event)
        _emit_to_user(event["recipientId"], "chat:game:invite:update", event)
    def handle_disconnect(sid: str) -> None:
        user_id = _register_offline(sid)
        if user_id is None:
            return
        _cancel_invitations(user_id)
        broadcast_friends()

    def _cancel_invitations(user_id: int) -> None:
        for event in matchmaker.cancel_invitations_for_user(user_id):
            event["status"] = "cancelled"
            if not enrich_invitation(event):
                return
            _emit_to_user(event["senderId"], "chat:game:invite:update", event)
            _emit_to_user(event["recipientId"], "chat:game:invite:update", event)
            for waiting_user_id in event.pop("waitingUserIds"):
                _emit_to_user(waiting_user_id, "game:status", {"state": "opponent_left"})
    return handle_disconnect
