import os
import time
import threading

import pytest
from flask import Flask, request
from flask_socketio import SocketIO

import social.handlers as social_handlers
import social.store as social_store
from auth.routes import SESSION_COOKIE_OPTIONS
from games.pong.match import PongMatch
from games.pong.handlers import (
    MalformedInput,
    _parse_input,
    register_pong_handlers,
)
from ws_core.matchmaker import Matchmaker

NICKNAMES = {1: "ana", 2: "bia"}

_broadcast_events = []
_broadcast_lock = None


def _broadcast(match_id, event, payload):
    with _broadcast_lock:
        _broadcast_events.append((match_id, event, payload))


def _make_match(left_user_id, right_user_id):
    return PongMatch(
        left_user_id,
        right_user_id,
        broadcast=_broadcast,
        on_match_finished=None,
        countdown_seconds=0.0,
    )


def _fake_profile(user_id):
    nickname = NICKNAMES.get(user_id)
    return None if nickname is None else (nickname, None)


@pytest.fixture
def env(monkeypatch):
    global _broadcast_lock
    _broadcast_events[:] = []
    _broadcast_lock = threading.Lock()
    social_handlers.identities.clear()
    social_handlers._online.clear()
    monkeypatch.setattr(social_store, "get_user_profile", _fake_profile)
    monkeypatch.setattr(social_store, "friend_rows", lambda me: [])
    monkeypatch.setattr(social_store, "get_friend_edge", lambda a, b: None)
    monkeypatch.setattr(social_store, "global_rows", lambda: [])
    monkeypatch.setattr(social_store, "private_rows", lambda me: [])
    monkeypatch.setattr(social_store, "is_blocked_between", lambda a, b: False)
    monkeypatch.setattr(social_store, "blocked_user_ids", lambda me: [])
    monkeypatch.setattr(social_store, "blocking_user_ids", lambda me: [])
    monkeypatch.setattr(social_store, "insert_message", lambda s, r, t: {})
    app = Flask(__name__)
    app.secret_key = os.urandom(32)
    app.config.update(SESSION_COOKIE_OPTIONS)
    socketio = SocketIO(app, async_mode="threading")
    matchmaker = Matchmaker(_make_match)
    pong_disconnect = register_pong_handlers(socketio, matchmaker)
    social_disconnect = social_handlers.register_social_handlers(
        socketio, matchmaker
    )

    @socketio.on("disconnect")
    def on_disconnect() -> None:
        sid = getattr(request, "sid", "")
        pong_disconnect(sid)
        social_disconnect(sid)

    yield (app, socketio, matchmaker)

    for match in list(matchmaker._match_by_user_id.values()):
        match.destroy()
    social_handlers.identities.clear()
    social_handlers._online.clear()
    social_handlers._socketio = None


def _http_client(app, user_id=None):
    client = app.test_client()
    if user_id is not None:
        with client.session_transaction() as session:
            session["user_id"] = user_id
            session["session_version"] = 0
    return client


def _connect(env, user_id=None):
    app, socketio, _ = env
    return socketio.test_client(
        app, flask_test_client=_http_client(app, user_id=user_id)
    )


def _drain(ws, name=None):
    events = ws.get_received()
    return [
        event["args"][0]
        for event in events
        if name is None or event["name"] == name
    ]


def test_convite_iniciado_leva_nicknames(env):
    _app, _socketio, matchmaker = env
    invitation_id = matchmaker.create_game_invitation(1, 2)
    assert matchmaker.respond_game_invitation(invitation_id, 2, True)

    ana = _connect(env, 1)
    bia = _connect(env, 2)
    _drain(ana)
    _drain(bia)

    ack = ana.emit("queue:join", {"inviteId": invitation_id}, callback=True)
    bia.emit("queue:join", {"inviteId": invitation_id}, callback=True)

    updates = [
        payload
        for payload in (*_drain(ana, "chat:game:invite:update"),
                        *_drain(bia, "chat:game:invite:update"))
        if payload.get("status") == "started"
    ]
    assert len(updates) == 2
    for payload in updates:
        assert payload["inviteId"] == invitation_id
        assert payload["senderId"] == 1
        assert payload["recipientId"] == 2
        assert payload["senderNickname"] == "ana"
        assert payload["recipientNickname"] == "bia"


def test_sair_da_fila_durante_espera_de_convite(env):
    _app, socketio, matchmaker = env
    invitation_id = matchmaker.create_game_invitation(1, 2)
    assert matchmaker.respond_game_invitation(invitation_id, 2, True)

    ana = _connect(env, 1)
    _drain(ana)

    ack = ana.emit("queue:join", {"inviteId": invitation_id}, callback=True)
    assert ack == {"status": "waiting"}
    sid_ana = matchmaker.get_sid_for_user(1)

    ack = ana.emit("queue:leave", callback=True)

    assert ack == {"status": "left"}
    assert matchmaker.in_queue(sid_ana) is False




def _wait_until(predicate, timeout=2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.01)
    return False


def _wait_for(ws, event_name, condition=None, timeout=2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for event in _drain(ws, event_name):
            if condition is None or condition(event):
                return event
        time.sleep(0.01)
    return None


def _parear(env):
    _app, _socketio, matchmaker = env
    invite = matchmaker.create_game_invitation(1, 2)
    assert matchmaker.respond_game_invitation(invite, 2, True)
    left = _connect(env, 1)
    right = _connect(env, 2)
    _drain(left)
    _drain(right)
    ack_left = left.emit("queue:join", {"inviteId": invite}, callback=True)
    ack_right = right.emit("queue:join", {"inviteId": invite}, callback=True)
    assert ack_left == {"status": "waiting"}
    assert ack_right == {"status": "matched"}
    assert _wait_until(lambda: len(matchmaker._match_by_user_id) == 2)
    match = next(iter(matchmaker._match_by_user_id.values()))
    return left, right, match, matchmaker


def test_input_fora_da_mesa_e_cortado(env):
    from games.pong.handlers import INPUT_LIMIT

    left, _right, match, _matchmaker = _parear(env)
    try:
        left.emit("paddle:input", {"position": 99})
        assert _wait_until(lambda: match.sim.left_paddle_position == INPUT_LIMIT)
    finally:
        match.destroy()


def test_input_com_nan_e_ignorado(env):
    left, _right, match, _matchmaker = _parear(env)
    try:
        left.emit("paddle:input", {"position": float("nan")})
        erro = _wait_for(left, "game:error")
        assert erro == {"reason": "malformed",
                        "message": "O movimento precisa ser um número."}
    finally:
        match.destroy()


def test_leave_antes_do_fim_invalido_e_no_fim_libera(env):
    left, right, match, matchmaker = _parear(env)
    try:
        left.emit("game:leave")
        assert _wait_for(
            left, "game:error", lambda event: event.get("reason") == "invalid"
        ) is not None
        assert matchmaker.get_match(matchmaker.get_sid_for_user(1)) is match

        match.sim.winner = "left"
        assert _wait_until(lambda: match.phase == "finished")

        ack = left.emit("game:leave", callback=True)
        assert ack == {"status": "left"}
        assert any(
            payload.get("state") == "opponent_left"
            for payload in _drain(right, "game:status")
        )
        assert _wait_until(lambda: len(matchmaker._match_by_user_id) == 0)
    finally:
        match.destroy()


def test_desconexao_publica_retomada_e_partida_continua(env):
    left, right, match, matchmaker = _parear(env)
    try:
        left.emit("paddle:input", {"position": 2.0})
        assert _wait_until(lambda: match.sim.left_paddle_position == 2.0)
        assert match.phase == "playing"

        left.disconnect()
        assert _wait_until(lambda: match.phase == "paused")
        assert any(
            payload.get("state") == "opponent_disconnected"
            for payload in _drain(right, "game:status")
        )

        revived = _connect(env, 1)
        ack = revived.emit("queue:join", callback=True)
        assert ack == {"status": "reconnected"}
        resumo = _wait_for(
            revived, "game:status",
            lambda payload: payload.get("state") == "resume_pending",
        )
        assert resumo is not None
        assert revived.emit("game:resume", callback=True) == {"status": "pending"}
        assert right.emit("game:resume", callback=True) == {"status": "resumed"}
        assert match.phase == "playing"
    finally:
        match.destroy()


def test_expiracao_destroi_partida_perdida(env, monkeypatch):
    _app, socketio, matchmaker = env
    left, right, match, _matchmaker = _parear(env)
    monkeypatch.setattr(socketio, "sleep", lambda *_args: None)
    try:
        left.disconnect()
        assert _wait_until(lambda: len(matchmaker._match_by_user_id) == 0)
        assert any(
            payload.get("state") == "opponent_left"
            for payload in _drain(right, "game:status")
        )
        later = _connect(env, 1)
        assert later.emit("queue:join", callback=True) == {"status": "waiting"}
    finally:
        match.destroy()


@pytest.mark.parametrize(
    "position",
    [float("nan"), float("inf"), -float("inf"), 10**400, True, "2", None],
)
def test_recusa_posicoes_invalidas(position):
    with pytest.raises(MalformedInput):
        _parse_input({"position": position})


@pytest.mark.parametrize("position", [-2.5, 0, 2.5])
def test_aceita_posicoes_finitas(position):
    assert _parse_input({"position": position}) == position
