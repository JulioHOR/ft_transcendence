import importlib

import pytest


@pytest.fixture
def gate_client(monkeypatch):
    monkeypatch.setenv("API_KEY", "c" * 64)

    import api_key as api_key_module
    importlib.reload(api_key_module)
    import db

    monkeypatch.setattr(db, "read_secret", lambda _name: "test-secret")
    import games.pong.store as pong_store

    monkeypatch.setattr(
        pong_store, "user_exists", lambda _user_id: True
    )
    monkeypatch.setattr(
        pong_store,
        "get_statistics",
        lambda _user_id: {"matchesPlayed": 0, "wins": 0},
    )
    monkeypatch.setattr(pong_store, "get_match_history", lambda _user_id: [])
    monkeypatch.setattr(pong_store, "get_leaderboard", lambda limit=10: [])
    application = importlib.import_module("app").app
    return application.test_client()


def test_rota_com_chave_valida_e_200(gate_client):
    response = gate_client.get(
        "/api/games/pong/statistics?id=1", headers={"X-API-Key": "c" * 64}
    )
    assert response.status_code == 200


def test_rota_sem_chave_e_401(gate_client):
    response = gate_client.get("/api/games/pong/statistics?id=1")
    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Informe uma sessão ou uma chave de API válida."
    }


def test_rota_com_chave_invalida_e_401(gate_client):
    response = gate_client.get(
        "/api/games/pong/statistics?id=1", headers={"X-API-Key": "f" * 64}
    )
    assert response.status_code == 401


def test_docs_permanecem_publicos(gate_client):
    assert gate_client.get("/api/docs/").status_code == 200
    assert gate_client.get("/api/me").status_code == 204
