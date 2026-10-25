import os

import pytest
from flask import Flask, request
from flask_socketio import SocketIO
from auth.routes import SESSION_COOKIE_OPTIONS

import social.handlers as handlers
import social.store as store_pkg
from social.routes import social_bp

USERS = {1: "ana", 2: "bia", 3: "carl"}
ACCEPTED_PAIR = (1, 2)
CREATED_AT = 1728000000000

_counter = {"id": 0}

def fake_get_user_profile(user_id):
    nickname = USERS.get(user_id)
    return None if nickname is None else (nickname, None)

def fake_find_user_by_nickname(nickname):
    for user_id, name in USERS.items():
        if name == nickname:
            return user_id, name, None
    return None

def fake_insert_message(sender_id, recipient_id, text):
    _counter["id"] += 1
    message = {
        "id": str(_counter["id"]),
        "userId": sender_id,
        "nickname": USERS[sender_id],
        "avatarUrl": None,
        "text": text,
        "createdAt": CREATED_AT + _counter["id"],
    }
    return message

def fake_friend_rows(fake_edges, me_id):
    rows = []
    for pair, (requester_id, status) in fake_edges.items():
        if me_id not in pair:
            continue
        other = pair[0] if pair[1] == me_id else pair[1]
        rows.append((other, status, requester_id, USERS[other], None))
    return rows

@pytest.fixture
def env(monkeypatch):
    handlers.identities.clear()
    handlers._online.clear()
    _counter["id"] = 0
    edges = {ACCEPTED_PAIR: (1, "accepted")}
    monkeypatch.setattr(store_pkg, "get_user_profile", fake_get_user_profile)
    monkeypatch.setattr(store_pkg, "find_user_by_nickname", fake_find_user_by_nickname)
    monkeypatch.setattr(store_pkg, "insert_message", fake_insert_message)
    monkeypatch.setattr(
        store_pkg, "friend_rows", lambda me_id: fake_friend_rows(edges, me_id)
    )
    monkeypatch.setattr(
        store_pkg,
        "get_friend_edge",
        lambda a, b: edges.get((min(a, b), max(a, b))),
    )
    monkeypatch.setattr(
        store_pkg,
        "insert_friend_edge",
        lambda requester_id, addressee_id: edges.__setitem__(
            (min(requester_id, addressee_id), max(requester_id, addressee_id)),
            (requester_id, "pending"),
        ),
    )
    monkeypatch.setattr(store_pkg, "global_rows", lambda: [])
    monkeypatch.setattr(store_pkg, "private_rows", lambda me: [])
    app = Flask(__name__)
    app.secret_key = os.urandom(32)
    app.config.update(SESSION_COOKIE_OPTIONS)
    app.register_blueprint(social_bp)
    socketio = SocketIO(app, async_mode="threading")
    social_disconnect = handlers.register_social_handlers(socketio)
    @socketio.on("disconnect")
    def on_disconnect(*_args):
        social_disconnect(getattr(request, "sid", ""))
    yield app, socketio
    handlers.identities.clear()
    handlers._online.clear()
    handlers._socketio = None

def http_client(app, user_id=None):
    client = app.test_client()
    if user_id is not None:
        with client.session_transaction() as sess:
            sess["user_id"] = user_id
    return client

def connect_api(env_obj, user_id=None):
    app, socketio = env_obj
    ws = socketio.test_client(
        app, flask_test_client=http_client(app, user_id=user_id)
    )
    return ws

def drain(ws, name=None):
    events = ws.get_received()
    return [event["args"][0] for event in events if name is None or event["name"] == name]

def test_chat_send_chega_em_todos_com_payload_exato(env):
    ana = connect_api(env, 1)
    bia = connect_api(env, 2)
    drain(ana)
    drain(bia)
    ana.emit("chat:send", {"text": "  ola mundo  "})
    for ws in (ana, bia):
        received = drain(ws, "chat:message")
        assert received == [{
            "id": "1",
            "userId": 1,
            "nickname": "ana",
            "avatarUrl": None,
            "text": "ola mundo",
            "createdAt": CREATED_AT + 1,
        }]
        assert "otherUserId" not in received[0]
        assert "conversationId" not in received[0]

def test_chat_send_sem_identidade_ou_texto_e_ignorado(env):
    anon = connect_api(env)
    ana = connect_api(env, 1)
    assert not anon.is_connected()
    drain(anon)
    drain(ana)
    ana.emit("chat:send", {"text": "   "})
    assert drain(ana, "chat:message") == []
    ana.emit("chat:send", {"text": "oi"})
    assert len(drain(ana, "chat:message")) == 1

def test_privada_entre_amigos_entrega_o_mesmo_objeto_nos_dois_lados(env):
    ana = connect_api(env, 1)
    bia = connect_api(env, 2)
    drain(ana)
    drain(bia)
    ana.emit("chat:private:send", {"otherUserId": 2, "text": "ei bia"})
    expected = {
        "id": "1",
        "userId": 1,
        "nickname": "ana",
        "avatarUrl": None,
        "text": "ei bia",
        "createdAt": CREATED_AT + 1,
        "otherUserId": 2,
        "conversationId": "1:2",
    }
    to_ana = drain(ana, "chat:private:message")
    to_bia = drain(bia, "chat:private:message")
    assert to_ana == [expected]
    assert to_bia == [expected]
    assert drain(ana, "chat:private:error") == []
    assert drain(bia, "chat:private:error") == []

def test_privada_sem_amizade_da_erro_somente_ao_emissor(env):
    ana = connect_api(env, 1)
    carl = connect_api(env, 3)
    drain(ana)
    drain(carl)
    carl.emit("chat:private:send", {"otherUserId": 1, "text": "oi estranho"})
    assert drain(carl, "chat:private:error") == [
        {"message": "Não é possível enviar mensagem privada: vocês ainda não são amigos."}
    ]
    assert drain(ana, "chat:private:message") == []
    assert drain(ana, "chat:private:error") == []

def test_typing_repassa_shape_exato(env):
    ana = connect_api(env, 1)
    bia = connect_api(env, 2)
    drain(ana)
    drain(bia)
    ana.emit("chat:private:typing", {"otherUserId": 2, "isTyping": True})
    assert drain(bia, "chat:private:typing") == [{
        "userId": 1,
        "nickname": "ana",
        "conversationId": "1:2",
        "isTyping": True,
    }]
    assert drain(ana, "chat:private:typing") == []
    ana.emit("chat:private:typing", {"otherUserId": 2, "isTyping": False})
    assert drain(bia, "chat:private:typing") == [{
        "userId": 1,
        "nickname": "ana",
        "conversationId": "1:2",
        "isTyping": False,
    }]

def test_typing_sem_amizade_ignora_em_silencio(env):
    ana = connect_api(env, 1)
    carl = connect_api(env, 3)
    drain(ana)
    drain(carl)
    carl.emit("chat:private:typing", {"otherUserId": 1, "isTyping": True})
    assert drain(ana, "chat:private:typing") == []
    assert drain(carl, "chat:private:typing") == []
    assert drain(carl, "chat:private:error") == []

def test_read_repassa_shape_exato(env):
    ana = connect_api(env, 1)
    bia = connect_api(env, 2)
    drain(ana)
    drain(bia)
    ana.emit("chat:private:read", {"otherUserId": 2, "lastMessageId": "9"})
    assert drain(bia, "chat:private:read") == [{
        "userId": 1,
        "conversationId": "1:2",
        "lastMessageId": "9",
    }]
    bia.emit("chat:private:read", {"otherUserId": 1, "lastMessageId": "12"})
    assert drain(ana, "chat:private:read") == [{
        "userId": 2,
        "conversationId": "1:2",
        "lastMessageId": "12",
    }]

def test_read_sem_id_ou_sem_amizade_ignora(env):
    ana = connect_api(env, 1)
    bia = connect_api(env, 2)
    carl = connect_api(env, 3)
    drain(ana)
    drain(bia)
    drain(carl)
    ana.emit("chat:private:read", {"otherUserId": 2, "lastMessageId": ""})
    assert drain(bia, "chat:private:read") == []
    carl.emit("chat:private:read", {"otherUserId": 1, "lastMessageId": "9"})
    assert drain(ana, "chat:private:read") == []

def test_connect_autenticado_recebe_lista_e_muda_presenca(env):
    ana = connect_api(env, 1)
    received_ana = drain(ana, "friends:update")
    assert received_ana == [
        [{
            "id": 2,
            "nickname": "bia",
            "avatarUrl": None,
            "online": False,
            "status": "accepted",
            "relation": "friend",
        }]
    ]
    bia = connect_api(env, 2)
    assert drain(bia, "friends:update") == [
        [{
            "id": 1,
            "nickname": "ana",
            "avatarUrl": None,
            "online": True,
            "status": "accepted",
            "relation": "friend",
        }]
    ]
    assert drain(ana, "friends:update") == [
        [{
            "id": 2,
            "nickname": "bia",
            "avatarUrl": None,
            "online": True,
            "status": "accepted",
            "relation": "friend",
        }]
    ]
    assert drain(bia, "friends:update") == []

def test_mutacao_rest_dispara_friends_update(env):
    app, _ = env
    ana = connect_api(env, 1)
    bia = connect_api(env, 2)
    drain(ana)
    drain(bia)
    response = http_client(app, user_id=1).post("/api/friends", json={"nickname": "bia"})
    assert response.status_code == 201
    expected_to_ana = [{
        "id": 2,
        "nickname": "bia",
        "avatarUrl": None,
        "online": True,
        "status": "pending",
        "relation": "outgoing",
    }]
    expected_to_bia = [{
        "id": 1,
        "nickname": "ana",
        "avatarUrl": None,
        "online": True,
        "status": "pending",
        "relation": "incoming",
    }]
    assert drain(ana, "friends:update") == [expected_to_ana]
    assert drain(bia, "friends:update") == [expected_to_bia]

def test_presenca_refcount_dois_sockets_do_mesmo_usuario(env):
    ana_a = connect_api(env, 1)
    ana_b = connect_api(env, 1)
    bia = connect_api(env, 2)
    drain(ana_a)
    drain(ana_b)
    assert drain(bia, "friends:update") == [[
        {
            "id": 1,
            "nickname": "ana",
            "avatarUrl": None,
            "online": True,
            "status": "accepted",
            "relation": "friend",
        }
    ]]
    ana_a.disconnect()
    assert drain(bia, "friends:update") == []
    ana_b.disconnect()
    assert drain(bia, "friends:update") == [[
        {
            "id": 1,
            "nickname": "ana",
            "avatarUrl": None,
            "online": False,
            "status": "accepted",
            "relation": "friend",
        }
    ]]
