import importlib
from contextlib import contextmanager


def _aplicacao(monkeypatch):
    monkeypatch.setenv("API_KEY", "a" * 64)

    import db

    monkeypatch.setattr(db, "read_secret", lambda _name: "test-secret")
    application = importlib.import_module("app").app

    from contextlib import contextmanager as _ctx

    class _Cursor:
        def execute(self, *args, **kwargs):
            pass

        def fetchone(self):
            return None

        def fetchall(self):
            return []

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    @contextmanager
    def fake_cursor():
        yield _Cursor()

    monkeypatch.setattr("auth.routes.db_cursor", fake_cursor)
    from rate_limit import limiter

    limiter.reset()
    return application.test_client()


def test_login_responde_429_apos_cinco_tentativas_por_conta(monkeypatch):
    client = _aplicacao(monkeypatch)
    body = {"email": "alvo@example.com", "password": "senha-errada"}
    for _ in range(5):
        assert client.post("/api/auth/login", json=body).status_code == 401

    response = client.post("/api/auth/login", json=body)

    assert response.status_code == 429
    assert response.get_json() == {
        "error": "Muitas requisições. Tente novamente em instantes."
    }


def test_signup_responde_429_apos_tres_tentativas_na_hora(monkeypatch):
    client = _aplicacao(monkeypatch)
    body = {"email": "invalida", "nickname": "inic~~", "password": "x"}
    for _ in range(3):
        assert client.post("/api/auth/signup", json=body).status_code == 400

    response = client.post("/api/auth/signup", json=body)

    assert response.status_code == 429


def test_limite_padrao_responde_429_na_121a_requisicao(monkeypatch):
    client = _aplicacao(monkeypatch)
    for _ in range(120):
        assert client.get("/api/me").status_code == 204

    assert client.get("/api/me").status_code == 429
