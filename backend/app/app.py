
import os
import time
from collections.abc import Iterator
from contextlib import contextmanager

import psycopg2
from flask import Flask, jsonify, request
from flask_socketio import SocketIO
from psycopg2.pool import ThreadedConnectionPool

app = Flask(__name__)
socketio = SocketIO(app, async_mode="threading", cors_allowed_origins=[])

app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
CONTENT_LIMIT = 1000

def register_game_routes():
    from games.pong.handlers import register_pong_handlers
    from ws_core.matchmaker import Matchmaker

    from games.pong.match import PongMatch

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

def _db_kwargs() -> dict:
    try:
        with open("/run/secrets/db_password") as f:
            password = f.read().strip()
    except OSError as exc:
        raise RuntimeError("secret db_password não legível") from exc
    return {
        "host": os.environ["POSTGRES_HOST"],
        "port": os.environ["POSTGRES_INTERNAL_PORT"],
        "dbname": os.environ["POSTGRES_DB"],
        "user": os.environ["POSTGRES_USER"],
        "password": password,
    }

def db():
    return psycopg2.connect(**_db_kwargs())

_pool: ThreadedConnectionPool | None = None

@contextmanager
def db_cursor() -> Iterator[psycopg2.extensions.cursor]:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(1, 8, **_db_kwargs())
    conn = _pool.getconn()
    try:
        with conn, conn.cursor() as cur:
            yield cur
    finally:
        _pool.putconn(conn)

def wait_db():
    for _ in range(60):
        try:
            conn = db()
            conn.close()
            return
        except psycopg2.OperationalError:
            time.sleep(1)
    raise RuntimeError("database not ready")

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
