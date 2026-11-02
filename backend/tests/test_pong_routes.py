import pytest
import games.pong.store as store_pkg
from auth.routes import SESSION_COOKIE_OPTIONS
from games.pong.routes import pong_bp
from flask import Flask


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(store_pkg, "user_exists", lambda user_id: user_id == 1)
    monkeypatch.setattr(
        store_pkg, "get_statistics", lambda user_id: {"matchesPlayed": 0, "wins": 0}
    )
    monkeypatch.setattr(store_pkg, "get_match_history", lambda user_id: [])
    monkeypatch.setattr(store_pkg, "get_leaderboard", lambda limit=10: [])
    app = Flask(__name__)
    app.secret_key = b"test"
    app.config.update(SESSION_COOKIE_OPTIONS)
    app.register_blueprint(pong_bp)
    return app.test_client()


def test_id_invalido_400_com_envelope_de_erro(client):
    response = client.get("/api/games/pong/statistics?id=abc")

    assert response.status_code == 400
    assert response.get_json() == {"error": "Informe um id de usuário válido."}


def test_id_inexistente_404_com_envelope_de_erro(client):
    response = client.get("/api/games/pong/statistics?id=7")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Usuário não encontrado."}


def test_estatisticas_ok(client):
    response = client.get("/api/games/pong/statistics?id=1")

    assert response.status_code == 200
    assert response.get_json() == {
        "matchesPlayed": 0,
        "wins": 0,
        "history": [],
        "leaderboard": [],
    }
