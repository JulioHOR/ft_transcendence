import os
from contextlib import contextmanager

import psycopg2
import pytest
from auth import routes
from auth.routes import SESSION_COOKIE_OPTIONS, auth_bp
from flask import Flask

SIGNUP_OK = {"email": "alice@example.com", "nickname": "alice_9", "password": "senha-forte-123"}
LOGIN_OK = {"email": "alice@example.com", "password": "senha-forte-123"}


class FakeCursor:

    def __init__(self, store):
        self._store = store
        self._rows = []

    def execute(self, sql, params=None):
        self._rows = self._store.run(sql, params)

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)


class FakeUsers:

    # race=True faz o SELECT de conflito mentir, expondo a guarda de IntegrityError.

    def __init__(self):
        self.rows = []
        self.next_id = 1
        self.race = False

    @contextmanager
    def db_cursor(self):
        yield FakeCursor(self)

    def _by_email(self, email):
        return next((row for row in self.rows if row[1] == email), None)

    def _by_nickname(self, nickname):
        return next((row for row in self.rows if row[2] == nickname), None)

    def run(self, sql, params):
        if sql.startswith("INSERT"):
            email, nickname, password_hash = params
            if self._by_email(email) or self._by_nickname(nickname):
                raise psycopg2.IntegrityError("duplicate key value violates unique constraint")
            user_id = self.next_id
            self.next_id += 1
            self.rows.append((user_id, email, nickname, password_hash))
            return [(user_id,)]
        if "OR nickname" in sql:
            if self.race:
                return []
            email, nickname = params
            return [(row[1], row[2]) for row in self.rows if row[1] == email or row[2] == nickname]
        if "WHERE email" in sql:
            (email,) = params
            row = self._by_email(email)
            return [row] if row else []
        if "WHERE id" in sql:
            (user_id,) = params
            row = next((row for row in self.rows if row[0] == user_id), None)
            return [(row[1], row[2])] if row else []
        raise AssertionError(f"SQL não coberto pelo fake: {sql}")


@pytest.fixture
def store():
    return FakeUsers()


@pytest.fixture
def client(monkeypatch, store):
    monkeypatch.setattr(routes, "db_cursor", store.db_cursor)
    app = Flask(__name__)
    app.secret_key = os.urandom(32)
    app.config.update(SESSION_COOKIE_OPTIONS)
    app.register_blueprint(auth_bp)
    with app.test_client() as test_client:
        yield test_client


def signup(client, **overrides):
    return client.post("/api/auth/signup", json={**SIGNUP_OK, **overrides})


def test_signup_cria_usuario_e_abre_sessao(client, store):
    response = signup(client)
    assert response.status_code == 201
    assert response.get_json() == {"id": 1, "email": "alice@example.com", "nickname": "alice_9"}
    assert len(store.rows) == 1
    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.get_json() == {"id": 1, "email": "alice@example.com", "nickname": "alice_9"}


def test_signup_normaliza_email(client, store):
    assert signup(client, email="  AliCe@Example.COM ").status_code == 201
    assert store.rows[0][1] == "alice@example.com"


def test_signup_email_duplicado_case_insensitive(client):
    assert signup(client).status_code == 201
    conflict = signup(client, email="ALICE@example.com", nickname="bob")
    assert conflict.status_code == 409
    assert conflict.get_json() == {"error": "email já existe"}


def test_signup_nickname_duplicado(client):
    assert signup(client).status_code == 201
    conflict = signup(client, email="bob@example.com", nickname=SIGNUP_OK["nickname"])
    assert conflict.status_code == 409
    assert conflict.get_json() == {"error": "nickname já existe"}


def test_signup_corrida_trata_unique_violation(client, store):
    assert signup(client).status_code == 201
    store.race = True
    conflict = signup(client, nickname="bob")
    assert conflict.status_code == 409
    assert conflict.get_json() == {"error": "email ou nickname já existe"}


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "alice"},
        {"email": "alice@example", "nickname": "bo"},
        {"nickname": "al"},
        {"nickname": "alice!"},
        {"password": "1234567"},
        {"password": 12345678},
        {"email": None},
    ],
)
def test_signup_entrada_invalida_400(client, store, overrides):
    body = {**SIGNUP_OK, **overrides}
    for key, value in list(body.items()):
        if value is None:
            del body[key]
    response = client.post("/api/auth/signup", json=body)
    assert response.status_code == 400
    assert "error" in response.get_json()
    assert store.rows == []


def test_signup_sem_json(client):
    response = client.post("/api/auth/signup", data="not json")
    assert response.status_code == 400


def test_signup_body_vazio_400(client, store):
    response = client.post("/api/auth/signup", json={})
    assert response.status_code == 400
    assert store.rows == []


def test_login_correto_cria_sessao(client):
    signup(client)
    client.post("/api/auth/logout")
    response = client.post("/api/auth/login", json=LOGIN_OK)
    assert response.status_code == 200
    assert response.get_json() == {"id": 1, "email": "alice@example.com", "nickname": "alice_9"}
    assert client.get("/api/me").status_code == 200


def test_login_email_normalizado(client):
    signup(client)
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={**LOGIN_OK, "email": "  ALICE@Example.COM "}).status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {"email": "alice@example.com", "password": "senha-errada"},
        {"email": "ninguem@example.com", "password": "senha-forte-123"},
        {"email": "alice@example.com"},
        {"password": "senha-forte-123"},
        {},
        {"email": 1, "password": "senha-forte-123"},
    ],
)
def test_login_falha_sempre_401_generico(client, body):
    signup(client)
    client.post("/api/auth/logout")
    response = client.post("/api/auth/login", json=body)
    assert response.status_code == 401
    assert response.get_json() == {"error": "credenciais inválidas"}


def test_me_sem_sessao_401(client):
    response = client.get("/api/me")
    assert response.status_code == 401
    assert response.get_json() == {"error": "não autenticado"}


def test_me_com_sessao_de_usuario_inexistente_401(client):
    signup(client)
    with client.session_transaction() as session:
        session["user_id"] = 999
    assert client.get("/api/me").status_code == 401
    with client.session_transaction() as session:
        assert "user_id" not in session


def test_logout_destroi_sessao(client):
    signup(client)
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/me").status_code == 401


def test_cookie_de_sessao_com_flags_de_seguranca(client):
    response = signup(client)
    cookie = response.headers["Set-Cookie"]
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=Lax" in cookie


def test_senha_nunca_aparece_em_nenhuma_resposta(client, store):
    responses = [
        signup(client),
        client.post("/api/auth/login", json=LOGIN_OK),
        client.get("/api/me"),
        client.post("/api/auth/logout"),
        signup(client, email="bob@example.com", nickname="bob"),
        client.post("/api/auth/login", json={**LOGIN_OK, "password": "errada-errada"}),
    ]
    for response in responses:
        assert b"senha-forte-123" not in response.data
    assert store.rows[0][3] != SIGNUP_OK["password"]
    assert "senha-forte-123" not in store.rows[0][3]
