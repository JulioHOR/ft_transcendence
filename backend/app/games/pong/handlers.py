import math
from collections.abc import Callable

from flask import request, session
from social import store as social_store
from ws_core.matchmaker import (
    AlreadyPlayingError,
    InvalidGameInvitationError,
    Matchmaker,
)

from .constants import TABLE
from .shared import clamp, now_ms

INPUT_LIMIT = TABLE["halfWidth"] - TABLE["paddleHalfDepth"]
DISCONNECT_GRACE_SECONDS = 30

MATCH_ALREADY_STARTED = "Espere a partida começar."
NOT_IN_MATCH = "Você não está em uma partida."


def _sid() -> str:
    return getattr(request, "sid", "")


def _session_user_id() -> int | None:
    user_id = session.get("user_id")
    return user_id if isinstance(user_id, int) else None


def _parse_position(data) -> float | None:
    if not isinstance(data, dict):
        return None
    position = data.get("position")
    if isinstance(position, bool) or not isinstance(position, (int, float)):
        return None
    if not math.isfinite(position):
        return None
    return position


def emit_status_to_players(socketio, matchmaker, match, state: str, **extra) -> None:
    for _user_id, sid, side in matchmaker.players(match):
        socketio.emit(
            "game:status", {"state": state, "side": side, **extra}, to=sid
        )


def emit_countdown(socketio, matchmaker, match) -> None:
    emit_status_to_players(
        socketio, matchmaker, match, "countdown", startsAt=match.starts_at_ms
    )


def register_pong_handlers(socketio, matchmaker: Matchmaker) -> Callable[[str], None]:
    def emit_error(sid: str, reason: str, message: str) -> None:
        if sid:
            socketio.emit("game:error", {"reason": reason, "message": message}, to=sid)

    def socket_is_alive(sid: str) -> bool:
        try:
            socketio.server.eio.get_session(sid)
        except KeyError:
            return False
        return True

    def release_match(match) -> None:
        for _user_id, player_sid, _side in matchmaker.players(match):
            matchmaker.leave(player_sid)
        match.destroy()

    def player_id(sid: str) -> int | None:
        user_id = matchmaker.get_user_id_for_sid(sid)
        if user_id is None:
            emit_error(sid, "unauthorized", "Entre na sua conta para jogar.")
        return user_id

    def opponent_sid(match, sid: str) -> str | None:
        return next(
            (player_sid for _user_id, player_sid, _side in matchmaker.players(match)
             if player_sid != sid),
            None,
        )

    def match_of_player(sid: str, missing_message: str):
        match = matchmaker.get_match(sid)
        if match is None:
            emit_error(sid, "not_in_match", missing_message)
        return match

    def notify_opponent_left(other_sid: str | None) -> None:
        if other_sid:
            socketio.emit("game:status", {"state": "opponent_left"}, to=other_sid)

    def restore_match_notice(sid: str, match) -> None:
        socketio.server.enter_room(sid, match.id)
        state = {"paused": "resume_pending", "finished": "finished"}.get(
            match.phase, "playing"
        )
        emit_status_to_players(socketio, matchmaker, match, state)

    def notify_invitation_started(invitation_id: str, invitation: dict) -> None:
        started_event = {
            "inviteId": invitation_id,
            "senderId": invitation["senderId"],
            "recipientId": invitation["recipientId"],
            "status": "started",
        }
        for key, user_id in (
            ("senderNickname", started_event["senderId"]),
            ("recipientNickname", started_event["recipientId"]),
        ):
            profile = social_store.get_user_profile(user_id)
            if profile is not None:
                started_event[key] = profile[0]
        for participant_id in (
            invitation["senderId"],
            invitation["recipientId"],
        ):
            socketio.emit(
                "chat:game:invite:update",
                started_event,
                room=f"user:{participant_id}",
            )

    @socketio.on("queue:join")
    def on_queue_join(data=None):
        invitation = None
        try:
            user_id = _session_user_id()
            if user_id is None:
                emit_error(_sid(), "unauthorized", "Entre na sua conta para jogar.")
                return None
            sid = _sid()
            match = matchmaker.reconnect_user(user_id, sid, socket_is_alive)
            if match is not None:
                restore_match_notice(sid, match)
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
            notify_invitation_started(invitation_id, invitation)
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
        position = _parse_position(data)
        if position is None:
            emit_error(_sid(), "malformed", "O movimento precisa ser um número.")
            return None

        match = match_of_player(_sid(), MATCH_ALREADY_STARTED)
        if match is None:
            return None

        user_id = player_id(_sid())
        if user_id is None:
            return None
        match.apply_input(user_id, clamp(position, -INPUT_LIMIT, INPUT_LIMIT), now_ms())

    @socketio.on("game:rematch")
    def on_game_rematch(_data=None):
        sid = _sid()
        match = match_of_player(sid, NOT_IN_MATCH)
        if match is None:
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
        match = match_of_player(sid, NOT_IN_MATCH)
        if match is None:
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

        emit_status_to_players(socketio, matchmaker, match, "playing")
        return {"status": "resumed"}

    @socketio.on("game:leave")
    def on_game_leave(_data=None):
        sid = _sid()
        match = match_of_player(sid, NOT_IN_MATCH)
        if match is None:
            return None
        if match.phase not in ("paused", "finished") or not match.try_close():
            emit_error(sid, "invalid", "A partida ainda não pode ser encerrada.")
            return None

        notify_opponent_left(opponent_sid(match, sid))
        release_match(match)
        return {"status": "left"}

    def expire_disconnected_match(user_id: int | None, disconnected_sid: str, match) -> None:
        socketio.sleep(DISCONNECT_GRACE_SECONDS)

        other_sid = opponent_sid(match, disconnected_sid)
        if user_id is not None and not matchmaker.claim_stale_match(
            disconnected_sid, user_id, match
        ):
            return

        notify_opponent_left(other_sid)
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
