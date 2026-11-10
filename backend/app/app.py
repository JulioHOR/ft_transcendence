import os
from collections.abc import Callable

from flask import Flask, jsonify, request
from flask_socketio import SocketIO
from werkzeug.middleware.proxy_fix import ProxyFix

from api_key import has_valid_api_key
from apidocs import init_api
from auth.routes import SESSION_COOKIE_OPTIONS, current_session_user_id
from db import read_secret, wait_db
from rate_limit import limiter

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
socketio = SocketIO(app, async_mode="threading", cors_allowed_origins=[])

app.secret_key = read_secret("flask_secret_key")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024
app.config.update(SESSION_COOKIE_OPTIONS)
limiter.init_app(app)

init_api(app)

SESSIONLESS_API_ENDPOINTS = {"auth.signup", "auth.login", "auth.me"}
PUBLIC_API_PREFIXES = ("/api/docs",)


def _is_public_api_request() -> bool:
    return request.path.startswith(PUBLIC_API_PREFIXES) or (
        request.endpoint in SESSIONLESS_API_ENDPOINTS
    )


def _has_api_access() -> bool:
    return current_session_user_id() is not None or has_valid_api_key(
        request.headers.get("X-API-Key")
    )


@app.before_request
def require_api_access():
    if not request.path.startswith("/api/"):
        return None
    if _is_public_api_request() or _has_api_access():
        return None
    return jsonify({"error": "Informe uma sessão ou uma chave de API válida."}), 401


@app.errorhandler(429)
def request_limit_exceeded(_error):
    return jsonify({"error": "Muitas requisições. Tente novamente em instantes."}), 429


def register_game_routes() -> tuple[Callable[[str], None], object]:
    from games.pong.handlers import register_pong_handlers
    from games.pong.match import PongMatch
    from games.pong.store import save_match
    from ws_core.matchmaker import Matchmaker

    def broadcast_to_match(match_id: str, event: str, payload: dict) -> None:
        socketio.emit(event, payload, to=match_id)

    def match_factory(left_user_id: int, right_user_id: int) -> PongMatch:
        return PongMatch(
            left_user_id,
            right_user_id,
            broadcast=broadcast_to_match,
            on_match_finished=save_match,
        )

    matchmaker = Matchmaker(match_factory)
    return register_pong_handlers(socketio, matchmaker), matchmaker


def register_social_routes(matchmaker) -> Callable[[str], None]:
    from social.handlers import register_social_handlers

    return register_social_handlers(socketio, matchmaker)


pong_handle_disconnect, pong_matchmaker = register_game_routes()
social_handle_disconnect = register_social_routes(pong_matchmaker)


@socketio.on("disconnect")
def on_client_disconnect(*_args) -> None:
    sid = getattr(request, "sid", "")
    pong_handle_disconnect(sid)
    social_handle_disconnect(sid)


if __name__ == "__main__":
    wait_db()
    try:
        port = int(os.environ["BACKEND_INTERNAL_PORT"])
    except (KeyError, ValueError) as exc:
        raise RuntimeError("BACKEND_INTERNAL_PORT não configurada/inválida") from exc
    bind_host = os.environ.get("BACKEND_BIND_HOST", "0.0.0.0")
    socketio.run(app, host=bind_host, port=port, allow_unsafe_werkzeug=True, log_output=False)
