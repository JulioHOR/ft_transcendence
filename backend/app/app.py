import os

from flask import Flask, request
from flask_socketio import SocketIO

from apidocs import init_api
from auth.routes import SESSION_COOKIE_OPTIONS
from db import read_secret, wait_db

app = Flask(__name__)
socketio = SocketIO(app, async_mode="threading", cors_allowed_origins=[])

app.secret_key = read_secret("flask_secret_key")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024
app.config.update(SESSION_COOKIE_OPTIONS)

init_api(app)

def register_game_routes():
    from games.pong.handlers import register_pong_handlers
    from games.pong.match import PongMatch
    from ws_core.matchmaker import Matchmaker

    def match_factory(left_user_id, right_user_id):
        return PongMatch(
            left_user_id,
            right_user_id,
            broadcast=lambda match_id, event, payload: socketio.emit(
                event, payload, to=match_id
            ),
        )

    return register_pong_handlers(socketio, Matchmaker(match_factory))

def register_social_routes():
    from social.handlers import register_social_handlers

    return register_social_handlers(socketio)


pong_handle_disconnect = register_game_routes()
social_handle_disconnect = register_social_routes()


@socketio.on("disconnect")
def on_client_disconnect(*_args):
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
