import importlib


def test_login_responde_429_apos_limite_de_requisicoes(monkeypatch):
    monkeypatch.setenv("API_KEY", "a" * 64)

    import db

    monkeypatch.setattr(db, "read_secret", lambda _name: "test-secret")
    application = importlib.import_module("app").app
    client = application.test_client()

    for _ in range(120):
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 401

    response = client.post("/api/auth/login", json={})

    assert response.status_code == 429
    assert response.get_json() == {
        "error": "Muitas requisições. Tente novamente em instantes."
    }
