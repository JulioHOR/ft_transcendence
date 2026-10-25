from collections.abc import Callable

from flask import request, session
from ws_core.matchmaker import (
    AlreadyPlayingError,
    InvalidGameInvitationError,
    Matchmaker,
)

from .constants import TABLE
from .shared import clamp, now_ms

INPUT_LIMIT = TABLE["halfWidth"] - TABLE["paddleHalfDepth"]


def _sid() -> str:
    return getattr(request, "sid", "")

def _user_id() -> int | None:
    user_id = session.get("user_id")
    return user_id if isinstance(user_id, int) else None


class MalformedInput(Exception):
    pass


def _parse_input(data) -> float:
    if not isinstance(data, dict):
        raise MalformedInput()
    position = data.get("position")
    if isinstance(position, bool) or not isinstance(position, (int, float)):
        raise MalformedInput()
    return position


def emit_countdown(socketio, matchmaker, match) -> None:
    for _user_id, sid, side in matchmaker.players(match):
        socketio.emit(
            "game:status",
            {"state": "countdown", "side": side, "startsAt": match.starts_at_ms},
            to=sid,
        )


def register_pong_handlers(socketio, matchmaker: Matchmaker) -> Callable[[str], None]:
    def emit_error(sid, reason: str, message: str) -> None:
        if sid:
            socketio.emit("game:error", {"reason": reason, "message": message}, to=sid)

    def release_match(match) -> None:
        for _user_id, player_sid, _side in matchmaker.players(match):
            matchmaker.leave(player_sid)
        match.destroy()

    def player_id(sid):
        user_id = matchmaker.get_user_id_for_sid(sid)
        if user_id is None:
            emit_error(sid, "unauthorized", "Entre na sua conta para jogar.")
        return user_id

    def opponent_sid(match, sid):
        return next(
            (player_sid for _user_id, player_sid, _side in matchmaker.players(match)
             if player_sid != sid),
            None,
        )

    @socketio.on("queue:join")
    def on_queue_join(data=None):
        invitation = None
        try:
            user_id = _user_id()
            if user_id is None:
                emit_error(_sid(), "unauthorized", "Entre na sua conta para jogar.")
                return None
            sid = _sid()
            match = matchmaker.reconnect_user(user_id, sid)
            if match is not None:
                socketio.server.enter_room(sid, match.id)
                state = {"paused": "resume_pending", "finished": "finished"}.get(
                    match.phase, "playing"
                )
                for _player_id, player_sid, side in matchmaker.players(match):
                    socketio.emit(
                        "game:status",
                        {"state": state, "side": side},
                        to=player_sid,
                    )
                return {"status": "reconnected"}

            invitation_id = data.get("inviteId") if isinstance(data, dict) else None
            if invitation_id is None:
                accepted_invitation = matchmaker.accepted_game_invitation_for_user(
                    user_id
                )
                if accepted_invitation is not None:
                    emit_error(
                        sid,
                        "accepted_invitation",
                        "Você tem uma partida combinada. Abra a conversa para entrar ou cancelar o convite.",
                    )
                    return None
                match = matchmaker.join(sid, user_id)
            elif isinstance(invitation_id, str):
                invitation = matchmaker.game_invitation(invitation_id)
                match = matchmaker.join_invitation(sid, user_id, invitation_id)
            else:
                raise InvalidGameInvitationError()
        except AlreadyPlayingError:
            emit_error(_sid(), "already_playing", "Você já está em uma partida.")
            return None
        except InvalidGameInvitationError:
            emit_error(_sid(), "invalid_invitation", "Este convite de jogo não está mais disponível.")
            return None

        if match is None:
            return {"status": "waiting"}

        for _player_id, sid, _side in matchmaker.players(match):
            socketio.server.enter_room(sid, match.id)
        if invitation_id is not None and invitation is not None:
            socketio.emit(
                "chat:game:invite:update",
                {
                    "inviteId": invitation_id,
                    "senderId": invitation["senderId"],
                    "recipientId": invitation["recipientId"],
                    "status": "started",
                },
                room=f"user:{invitation['senderId']}",
            )
            socketio.emit(
                "chat:game:invite:update",
                {
                    "inviteId": invitation_id,
                    "senderId": invitation["senderId"],
                    "recipientId": invitation["recipientId"],
                    "status": "started",
                },
                room=f"user:{invitation['recipientId']}",
            )
        emit_countdown(socketio, matchmaker, match)
        return {"status": "matched"}

    @socketio.on("queue:leave")
    def on_queue_leave(_data=None):
        if not matchmaker.in_queue(_sid()):
            emit_error(_sid(), "invalid", "Você não está esperando um oponente.")
            return None
        matchmaker.leave(_sid())
        return {"status": "left"}

    @socketio.on("paddle:input")
    def on_paddle_input(data):
        try:
            position = _parse_input(data)
        except MalformedInput:
            emit_error(_sid(), "malformed", "O movimento precisa ser um número.")
            return None

        match = matchmaker.get_match(_sid())
        if match is None:
            emit_error(_sid(), "not_in_match", "Espere a partida começar.")
            return None

        user_id = player_id(_sid())
        if user_id is None:
            return None
        match.apply_input(user_id, clamp(position, -INPUT_LIMIT, INPUT_LIMIT), now_ms())

    @socketio.on("game:rematch")
    def on_game_rematch(_data=None):
        sid = _sid()
        match = matchmaker.get_match(sid)
        if match is None:
            emit_error(sid, "not_in_match", "Você não está em uma partida.")
            return None

        user_id = player_id(sid)
        if user_id is None:
            return None
        outcome = match.accept_rematch(user_id)
        if outcome == "rejected":
            emit_error(sid, "invalid", "Aguarde o fim da partida para jogar de novo.")
            return None
        if outcome == "pending":
            socketio.emit(
                "game:status",
                {"state": "rematch_pending", "accepted": match.accepted_sides()},
                room=match.id,
            )
            return {"status": "pending"}

        emit_countdown(socketio, matchmaker, match)
        return {"status": "countdown"}

    @socketio.on("game:resume")
    def on_game_resume(_data=None):
        sid = _sid()
        match = matchmaker.get_match(sid)
        if match is None:
            emit_error(sid, "not_in_match", "Você não está em uma partida.")
            return None

        user_id = player_id(sid)
        if user_id is None:
            return None
        outcome = match.accept_resume(user_id)
        if outcome == "rejected":
            emit_error(sid, "invalid", "A partida não está aguardando confirmação.")
            return None
        if outcome == "pending":
            socketio.emit(
                "game:status",
                {"state": "resume_pending", "accepted": match.accepted_sides()},
                room=match.id,
            )
            return {"status": "pending"}

        for _player_id, player_sid, side in matchmaker.players(match):
            socketio.emit(
                "game:status",
                {"state": "playing", "side": side},
                to=player_sid,
            )
        return {"status": "resumed"}

    @socketio.on("game:leave")
    def on_game_leave(_data=None):
        sid = _sid()
        match = matchmaker.get_match(sid)
        if match is None:
            emit_error(sid, "not_in_match", "Você não está em uma partida.")
            return None
        if match.phase not in ("paused", "finished"):
            emit_error(sid, "invalid", "A partida ainda não pode ser encerrada.")
            return None

        other_sid = opponent_sid(match, sid)
        if other_sid:
            socketio.emit("game:status", {"state": "opponent_left"}, to=other_sid)
        release_match(match)
        return {"status": "left"}

    def expire_disconnected_match(user_id, disconnected_sid, match):
        socketio.sleep(30)

        if user_id is not None:
            if matchmaker.get_user_id_for_sid(disconnected_sid) != user_id:
                return

        other_sid = opponent_sid(match, disconnected_sid)
        if other_sid:
            socketio.emit(
                "game:status",
                {"state": "opponent_left"},
                to=other_sid,
            )

        release_match(match)

    def handle_disconnect(sid: str) -> None:
        if not sid:
            return
        match = matchmaker.get_match(sid)
        if match is None:
            matchmaker.leave(sid)
            return
        user_id = matchmaker.get_user_id_for_sid(sid)
        match.pause()

        other_sid = opponent_sid(match, sid)
        if other_sid:
            socketio.emit(
                "game:status",
                {"state": "opponent_disconnected"},
                to=other_sid,
            )
            socketio.start_background_task(
                expire_disconnected_match,
                user_id,
                sid,
                match,
            )

    return handle_disconnect
