import os
import threading

import pytest
from flask import Flask
from flask_socketio import SocketIO

import social.handlers as social_handlers
import social.store as social_store
from auth.routes import SESSION_COOKIE_OPTIONS
from games.pong.match import PongMatch
from games.pong.handlers import register_pong_handlers
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
    register_pong_handlers(socketio, matchmaker)
    social_disconnect = social_handlers.register_social_handlers(
        socketio, matchmaker
    )
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
