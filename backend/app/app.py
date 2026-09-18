
import os

from flask import Flask, jsonify, request
from flask_socketio import SocketIO

from auth.routes import SESSION_COOKIE_OPTIONS, auth_bp
from db import db_cursor, read_secret, wait_db

app = Flask(__name__)
socketio = SocketIO(app, async_mode="threading", cors_allowed_origins=[])

app.secret_key = read_secret("flask_secret_key")
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
app.config.update(SESSION_COOKIE_OPTIONS)
CONTENT_LIMIT = 1000

app.register_blueprint(auth_bp)

def register_game_routes():
    from games.pong.handlers import register_pong_handlers
    from games.pong.match import PongMatch
    from ws_core.matchmaker import Matchmaker

    def match_factory(left_sid, right_sid):
        return PongMatch(
            left_sid,
            right_sid,
            broadcast=lambda match_id, event, payload: socketio.emit(
                event, payload, to=match_id
            ),
        )

    register_pong_handlers(socketio, Matchmaker(match_factory))

register_game_routes()


@app.get("/api/messages")
def get_messages():
    with db_cursor() as cur:
        cur.execute("SELECT id, content FROM messages ORDER BY id;")
        rows = [{"id": row[0], "content": row[1]} for row in cur.fetchall()]
    return jsonify(rows)

@app.post("/api/messages")
def post_message():
    content = (request.get_json(silent=True) or {}).get("content", "")
    if not isinstance(content, str):
        return jsonify({"error": "content deve ser texto"}), 400
    if len(content) > CONTENT_LIMIT:
        return jsonify({"error": "content excede o limite"}), 400
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO messages (content) VALUES (%s) RETURNING id;",
            (content,),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("INSERT RETURNING sem linha")
        new_id = row[0]
    return jsonify({"id": new_id, "content": content}), 201

if __name__ == "__main__":
    wait_db()
    try:
        port = int(os.environ["BACKEND_INTERNAL_PORT"])
    except (KeyError, ValueError) as exc:
        raise RuntimeError("BACKEND_INTERNAL_PORT não configurada/inválida") from exc
    bind_host = os.environ.get("BACKEND_BIND_HOST", "0.0.0.0")
    socketio.run(app, host=bind_host, port=port, allow_unsafe_werkzeug=True, log_output=False)
