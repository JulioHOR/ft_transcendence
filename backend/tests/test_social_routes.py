import base64
import datetime
import os

import psycopg2
import pytest
from auth.routes import SESSION_COOKIE_OPTIONS
from flask import Flask

import social.handlers as handlers
import social.store as store_pkg
from social.routes import social_bp

GRAPH_PNG = bytes.fromhex("89504e470d0a1a0a")
AVATAR_TS = datetime.datetime.now(datetime.timezone.utc)

def avatar_url(user_id, ts):
    return store_pkg.avatar_url(user_id, ts)

class FakeStore:
    def __init__(self):
        self.users = {1: {"email": "ana@x.io", "nickname": "ana"}}
        self.avatars = {}
        self.edges = {}
    def get_user_profile(self, user_id):
        user = self.users.get(user_id)
        if user is None:
            return None
        avatar = self.avatars.get(user_id)
        return user["nickname"], None if avatar is None else avatar[2]
    def update_nickname(self, user_id, nickname):
        user = self.users.get(user_id)
        if user is None:
            raise LookupError("usuário não existe")
        if any(
            other_id != user_id and other["nickname"] == nickname
            for other_id, other in self.users.items()
        ):
            raise psycopg2.IntegrityError("duplicate")
        user["nickname"] = nickname
        avatar = self.avatars.get(user_id)
        return user["email"], None if avatar is None else avatar[2]
    def set_avatar(self, user_id, content_type, data):
        assert user_id in self.users
        self.avatars[user_id] = (content_type, data, AVATAR_TS)
        return self.avatars[user_id][2]
    def get_avatar(self, user_id):
        return self.avatars.get(user_id)
    def find_user_by_nickname(self, nickname):
        for user_id, user in self.users.items():
            if user["nickname"] == nickname:
                avatar = self.avatars.get(user_id)
                return user_id, user["nickname"], None if avatar is None else avatar[2]
        return None
    def insert_friend_edge(self, requester_id, addressee_id):
        pair = (min(requester_id, addressee_id), max(requester_id, addressee_id))
        if pair in self.edges:
            raise psycopg2.IntegrityError("duplicate")
        self.edges[pair] = (requester_id, "pending")
    def accept_edge(self, from_id, to_id):
        pair = (min(from_id, to_id), max(from_id, to_id))
        if self.edges.get(pair) == (from_id, "pending"):
            self.edges[pair] = (from_id, "accepted")
            return True
        return False
    def reject_edge(self, from_id, to_id):
        pair = (min(from_id, to_id), max(from_id, to_id))
        if self.edges.get(pair) == (from_id, "pending"):
            del self.edges[pair]
            return True
        return False
    def delete_edges(self, a, b):
        self.edges.pop((min(a, b), max(a, b)), None)

@pytest.fixture
def store():
    return FakeStore()

@pytest.fixture
def client(monkeypatch, store):
    fake = store
    monkeypatch.setattr(store_pkg, "get_user_profile", fake.get_user_profile)
    monkeypatch.setattr(store_pkg, "update_nickname", fake.update_nickname)
    monkeypatch.setattr(store_pkg, "set_avatar", fake.set_avatar)
    monkeypatch.setattr(store_pkg, "get_avatar", fake.get_avatar)
    monkeypatch.setattr(store_pkg, "find_user_by_nickname", fake.find_user_by_nickname)
    monkeypatch.setattr(store_pkg, "insert_friend_edge", fake.insert_friend_edge)
    monkeypatch.setattr(store_pkg, "accept_edge", fake.accept_edge)
    monkeypatch.setattr(store_pkg, "reject_edge", fake.reject_edge)
    monkeypatch.setattr(store_pkg, "delete_edges", fake.delete_edges)
    monkeypatch.setattr(handlers, "_socketio", None)
    app = Flask(__name__)
    app.secret_key = os.urandom(32)
    app.config.update(SESSION_COOKIE_OPTIONS)
    app.register_blueprint(social_bp)
    with app.test_client() as test_client:
        yield test_client

def login(client, user_id):
    with client.session_transaction() as sess:
        sess["user_id"] = user_id

def logout(client):
    with client.session_transaction() as sess:
        sess.pop("user_id", None)

def test_le_perfil_publico_com_shape_exato(client):
    response = client.get("/api/profile?id=1")
    assert response.status_code == 200
    assert response.get_json() == {"id": 1, "nickname": "ana", "avatarUrl": None}

def test_le_perfil_publico_com_avatar(client, store):
    store.avatars[1] = ("image/png", GRAPH_PNG, AVATAR_TS)
    response = client.get("/api/profile?id=1")
    assert response.get_json() == {
        "id": 1,
        "nickname": "ana",
        "avatarUrl": avatar_url(1, AVATAR_TS),
    }

def test_le_perfil_com_id_invalido_400(client):
    for query in ("", "?id=", "?id=abc", "?id=1.5"):
        response = client.get(f"/api/profile{query}")
        assert response.status_code == 400
        assert response.get_json() == {"error": "O id informado não é um número."}


def test_le_perfil_inexistente_404(client):
    response = client.get("/api/profile?id=999")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Usuário não encontrado para o id informado."}

def test_patch_de_perfil_sem_sessao_401(client):
    response = client.patch("/api/profile", json={"nickname": "ana2"})
    assert response.status_code == 401
    assert response.get_json() == {"error": "Você não está logado."}

def test_patch_da_sessao_ignora_id_e_email_do_corpo(client, store):
    login(client, 1)
    response = client.patch(
        "/api/profile", json={"id": 999, "email": "hacker@x.io", "nickname": "ana2"}
    )
    assert response.status_code == 200
    assert response.get_json() == {
        "id": 1,
        "email": "ana@x.io",
        "nickname": "ana2",
        "avatarUrl": None,
    }
    assert all(other["email"] == "ana@x.io" for other in store.users.values())

def test_patch_sem_nickname_400(client, monkeypatch):
    login(client, 1)
    called = []
    def boom(user_id, nickname):
        called.append((user_id, nickname))
        return "ana@x.io", None
    monkeypatch.setattr(store_pkg, "update_nickname", boom)
    for body in ({}, {"nickname": None}, {"nickname": 7}, {"nickname": []}):
        response = client.patch("/api/profile", json=body)
        assert response.status_code == 400
        assert response.get_json() == {"error": "Informe o novo nickname."}
    assert called == []

def test_patch_com_nickname_fora_da_regra_400(client, monkeypatch):
    login(client, 1)
    monkeypatch.setattr(store_pkg, "update_nickname", lambda *_: ("e", None))
    for nickname, message in (
        ("ab", "O nickname precisa ter entre 3 e 20 caracteres."),
        ("tem espaco", "O nickname só aceita letras, números e _."),
        ("com-acento", "O nickname só aceita letras, números e _."),
    ):
        response = client.patch("/api/profile", json={"nickname": nickname})
        assert response.status_code == 400
        assert response.get_json() == {"error": message}

def test_patch_com_nickname_duplicado_409(client, store):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    login(client, 1)
    response = client.patch("/api/profile", json={"nickname": "bia"})
    assert response.get_json() == {"error": "Este nickname já está em uso por outro usuário."}
    assert response.status_code == 409

def test_patch_para_o_mesmo_nickname_passa_e_mantem_200(client):
    login(client, 1)
    response = client.patch("/api/profile", json={"nickname": "ana"})
    assert response.status_code == 200
    assert response.get_json()["nickname"] == "ana"

def test_patch_da_sessao_de_usuario_removido_401(client, monkeypatch):
    login(client, 42)
    def missing(user_id, nickname):
        raise LookupError("usuário não existe")
    monkeypatch.setattr(store_pkg, "update_nickname", missing)
    response = client.patch("/api/profile", json={"nickname": "ana2"})
    assert response.status_code == 401
    assert response.get_json() == {"error": "Você não está logado."}
    with client.session_transaction() as sess:
        assert "user_id" not in sess

def test_avatar_sem_sessao_401(client):
    response = client.post(
        "/api/profile/avatar", json={"avatarDataUrl": "data:image/png;base64,AAA"}
    )
    assert response.status_code == 401

def test_avatar_ok_grava_e_devolve_url_versionada(client, store):
    login(client, 1)
    payload = {"avatarDataUrl": "data:image/png;base64,iVBORw0KGgo="}
    response = client.post("/api/profile/avatar", json=payload)
    assert response.status_code == 200
    body = response.get_json()
    assert body == {
        "id": 1,
        "nickname": "ana",
        "avatarUrl": avatar_url(1, AVATAR_TS),
    }
    assert store.avatars[1][0] == "image/png"
    assert store.avatars[1][1] == base64.b64decode("iVBORw0KGgo=")

def test_avatar_data_url_invalido_400(client):
    login(client, 1)
    formato_ruim = (
        "data:application/pdf;base64,AAAA",
        "iVBORw0KGgo",
    )
    for value in formato_ruim:
        response = client.post("/api/profile/avatar", json={"avatarDataUrl": value})
        assert response.status_code == 400, value
        assert response.get_json() == {
            "error": "avatarDataUrl precisa ser um data URL de imagem em base64 "
                     "(ex.: data:image/png;base64,AAAA)."
        }
    base64_ruim = (
        "data:image/png;base64,####",
        "data:image/png;base64,iVBORw0KGg=qqq",
    )
    for value in base64_ruim:
        response = client.post("/api/profile/avatar", json={"avatarDataUrl": value})
        assert response.status_code == 400, value
        assert response.get_json() == {"error": "O conteúdo do avatar não é um base64 válido."}
    fora_do_tipo = (None, 42)
    for value in fora_do_tipo:
        response = client.post("/api/profile/avatar", json={"avatarDataUrl": value})
        assert response.status_code == 400, value
        assert response.get_json() == {
            "error": "Envie o campo avatarDataUrl como texto (data URL de imagem)."
        }


def test_avatar_grande_400(client):
    login(client, 1)
    big = base64.b64encode(b"x" * 600_001).decode()
    payload = {"avatarDataUrl": f"data:image/png;base64,{big}"}
    assert len(payload["avatarDataUrl"]) > 800_000
    response = client.post("/api/profile/avatar", json=payload)
    assert response.status_code == 400
    assert response.get_json() == {"error": "O avatar excede o limite de 600 KB."}

def test_baixa_avatar_com_bytes_e_headers(client, store):
    store.avatars[2] = ("image/jpeg", b"\xff\xd8\xff", AVATAR_TS)
    response = client.get("/api/profile/avatar/2")
    assert response.status_code == 200
    assert response.mimetype == "image/jpeg"
    assert response.headers["Cache-Control"] == "no-cache"

def test_baixa_avatar_inexistente_404(client):
    response = client.get("/api/profile/avatar/9")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Este usuário ainda não tem avatar."}

def test_historico_sem_sessao_401(client):
    assert client.get("/api/chat/history").status_code == 401

def test_historico_vazio(client, monkeypatch):
    login(client, 1)
    monkeypatch.setattr(store_pkg, "global_rows", lambda: [])
    monkeypatch.setattr(store_pkg, "private_rows", lambda me: [])
    response = client.get("/api/chat/history")
    assert response.status_code == 200
    assert response.get_json() == {"global": [], "conversations": []}

def _private_row(sender, recipient, text, nickname, peer_id, peer_nickname="bia",
                 message_id="9"):
    return {
        "id": message_id,
        "senderId": sender,
        "recipientId": recipient,
        "peerId": peer_id,
        "peerNickname": peer_nickname,
        "userId": sender,
        "nickname": nickname,
        "avatarUrl": None,
        "text": text,
        "createdAt": 1728000000000,
    }

def test_historico_monta_conversa_privada_exata(client, monkeypatch):
    login(client, 1)
    monkeypatch.setattr(
        store_pkg,
        "global_rows",
        lambda: [{
            "id": "3",
            "userId": 1,
            "nickname": "ana",
            "avatarUrl": None,
            "text": "ola",
            "createdAt": 1727900000000,
        }],
    )
    monkeypatch.setattr(
        store_pkg,
        "private_rows",
        lambda me: (
            _private_row(1, 2, "oi bia", "ana", 2, message_id="9"),
            _private_row(2, 1, "opa", "bia", 2, "bia", "11"),
        ),
    )
    response = client.get("/api/chat/history")
    body = response.get_json()
    assert body["global"] == [{
        "id": "3",
        "userId": 1,
        "nickname": "ana",
        "avatarUrl": None,
        "text": "ola",
        "createdAt": 1727900000000,
    }]
    assert len(body["conversations"]) == 1
    conversation = body["conversations"][0]
    assert conversation["conversationId"] == "1:2"
    assert conversation["otherUserId"] == 2
    assert conversation["otherNickname"] == "bia"
    assert [message["id"] for message in conversation["messages"]] == ["9", "11"]
    for message in conversation["messages"]:
        assert set(message) == {
            "id", "userId", "nickname", "avatarUrl", "text", "createdAt",
            "otherUserId", "conversationId",
        }
        assert message["conversationId"] == "1:2"

def test_historico_mensagens_de_lados_diferentes_da_conversa(client, monkeypatch):
    login(client, 2)
    monkeypatch.setattr(store_pkg, "global_rows", lambda: [])
    monkeypatch.setattr(
        store_pkg,
        "private_rows",
        lambda me: (_private_row(1, 2, "oi bia", "ana", 1, "ana"),),
    )
    body = client.get("/api/chat/history").get_json()
    conversation = body["conversations"][0]
    assert conversation["conversationId"] == "1:2"
    assert conversation["otherUserId"] == 1
    assert conversation["otherNickname"] == "ana"
    assert conversation["messages"][0]["otherUserId"] == 1

def test_add_friend_sem_sessao_401(client):
    response = client.post("/api/friends", json={"nickname": "bia"})
    assert response.status_code == 401

def test_add_friend_para_si_mesmo_400(client, store):
    login(client, 1)
    response = client.post("/api/friends", json={"nickname": "ana"})
    assert response.status_code == 400
    assert response.get_json() == {"error": "Você não pode se adicionar como amigo."}
    assert store.edges == {}

def test_add_friend_convite_de_outro_usuario(client, store, monkeypatch):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    monkeypatch.setattr(handlers, "user_online", lambda uid: uid == 2)
    login(client, 1)
    response = client.post("/api/friends", json={"nickname": " bia "})
    assert response.status_code == 201
    body = response.get_json()
    assert body == {
        "id": 2,
        "nickname": "bia",
        "avatarUrl": None,
        "online": True,
        "status": "pending",
        "relation": "outgoing",
    }
    assert store.edges[(1, 2)] == (1, "pending")

def test_add_friend_sem_nickname_400(client):
    login(client, 1)
    for body in ({}, {"nickname": ""}, {"nickname": "   "}, {"nickname": None}):
        response = client.post("/api/friends", json=body)
        assert response.status_code == 400
        assert response.get_json() == {"error": "Informe o nickname do amigo que você quer adicionar."}

def test_add_friend_inexistente_404(client):
    login(client, 1)
    response = client.post("/api/friends", json={"nickname": "fantasma"})
    assert response.status_code == 404
    assert response.get_json() == {"error": "Nenhum usuário encontrado com esse nickname."}

def test_add_friend_relacao_ja_existe_409_inversa(client, store):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    login(client, 1)
    assert client.post("/api/friends", json={"nickname": "bia"}).status_code == 201
    logout(client)
    login(client, 2)
    response = client.post("/api/friends", json={"nickname": "ana"})
    assert response.status_code == 409
    assert response.get_json() == {"error": "Já existe um convite entre vocês ou vocês já são amigos."}

def test_remove_friend_sem_sessao_401(client):
    assert client.delete("/api/friends/2").status_code == 401

def test_remove_friend_e_idempotente(client, store):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    store.edges[(1, 2)] = (2, "accepted")
    login(client, 1)
    assert client.delete("/api/friends/2").status_code == 204
    assert client.delete("/api/friends/2").status_code == 204
    assert (1, 2) not in store.edges

def test_aceitar_convite_sem_sessao_401(client):
    assert client.post("/api/friends/2/accept").status_code == 401

def test_aceitar_convite_sem_convite_pendente_404(client, store):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    store.edges[(1, 2)] = (1, "accepted")
    login(client, 2)
    response = client.post("/api/friends/1/accept")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Não há convite pendente desse usuário para você."}

def test_aceitar_convite_ok(client, store, monkeypatch):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    store.edges[(1, 2)] = (1, "pending")
    monkeypatch.setattr(handlers, "user_online", lambda uid: True)
    login(client, 2)
    response = client.post("/api/friends/1/accept")
    assert response.status_code == 200
    body = response.get_json()
    assert body == {
        "id": 1,
        "nickname": "ana",
        "avatarUrl": None,
        "online": True,
        "status": "accepted",
        "relation": "friend",
    }
    assert store.edges[(1, 2)] == (1, "accepted")

def test_rejeitar_convite_ok_204(client, store):
    store.users[2] = {"email": "bia@x.io", "nickname": "bia"}
    store.edges[(1, 2)] = (1, "pending")
    login(client, 2)
    assert client.post("/api/friends/1/reject").status_code == 204
    assert (1, 2) not in store.edges

def test_rejeitar_convite_inexistente_404(client):
    login(client, 2)
    response = client.post("/api/friends/1/reject")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Não há convite pendente desse usuário para você."}
