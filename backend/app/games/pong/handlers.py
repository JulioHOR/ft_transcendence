from flask import request
from ws_core.matchmaker import AlreadyPlayingError, Match, Matchmaker

from .constants import TABLE
from .shared import clamp, now_ms

def _sid() -> str:
    return getattr(request, "sid", "")

INPUT_LIMIT = TABLE["halfWidth"] - TABLE["paddleHalfDepth"]

class MalformedInput(Exception):
    pass

def _parse_input(data) -> float:
    if not isinstance(data, dict):
        raise MalformedInput()
    offset = data.get("offset")
    sequence = data.get("sequence")
    if isinstance(offset, bool) or not isinstance(offset, (int, float)):
        raise MalformedInput()
    if isinstance(sequence, bool) or not isinstance(sequence, int):
        raise MalformedInput()
    return offset

def register_pong_handlers(socketio, matchmaker: Matchmaker) -> None:
    def _error(sid, reason: str, message: str) -> None:
        if sid:
            socketio.emit("game:error", {"reason": reason, "message": message}, to=sid)

    @socketio.on("queue:join")
    def on_queue_join(_data=None):
        try:
            match = matchmaker.join(_sid())
        except AlreadyPlayingError:
            _error(_sid(), "already_playing", "Você já está na fila ou em partida.")
            return None

        if match is None:
            return {"status": "waiting"}

        for player_sid in match.sides:
            socketio.server.enter_room(player_sid, match.id)
        socketio.emit("game:status", {"state": "playing"}, room=match.id)
        return {"status": "matched"}

    @socketio.on("queue:leave")
    def on_queue_leave(_data=None):
        if not matchmaker.in_queue(_sid()):
            _error(_sid(), "invalid", "Você não está na fila de espera.")
            return None
        matchmaker.leave(_sid())
        return {"status": "left"}

    @socketio.on("paddle:input")
    def on_paddle_input(data):
        try:
            offset = _parse_input(data)
        except MalformedInput:
            _error(_sid(), "malformed", "Payload de input inválido.")
            return None

        match = matchmaker.get_match(_sid())
        if match is None:
            _error(_sid(), "not_in_match", "Entre na fila antes de jogar.")
            return None

        if not match.apply_input(_sid(), clamp(offset, -INPUT_LIMIT, INPUT_LIMIT), now_ms()):
            _error(_sid(), "invalid", "Partida encerrada — input ignorado.")

    @socketio.on("game:restart")
    def on_game_restart(_data=None):
        match = matchmaker.get_match(_sid())
        if match is None:
            _error(_sid(), "not_in_match", "Você não está em partida.")
            return None
        if not match.restart():
            _error(_sid(), "invalid", "Restart só após o fim da partida.")
            return None
        socketio.emit("game:status", {"state": "playing"}, room=match.id)

    @socketio.on("disconnect")
    def on_disconnect(*_args):
        _handle_disconnect(socketio, matchmaker, _sid())

def _handle_disconnect(socketio, matchmaker: Matchmaker, sid) -> None:
    if not sid:
        return
    match = matchmaker.get_match(sid)
    if match is None:
        matchmaker.leave(sid)
        return

    for player_sid in match.sides:
        socketio.emit("game:status", {"state": "opponent_left"}, to=player_sid)
        matchmaker.leave(player_sid)
    match.destroy()
