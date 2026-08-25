#!/usr/bin/env python3

import os
import time

import psycopg2
from flask import Flask, jsonify, request

app = Flask(__name__)


def db():
    with open("/run/secrets/db_password") as f:
        password = f.read().strip()
    return psycopg2.connect(
        host=os.environ["POSTGRES_HOST"],
        port=os.environ["POSTGRES_INTERNAL_PORT"],
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=password,
    )


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
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT id, content FROM messages ORDER BY id;")
    rows = [{"id": row[0], "content": row[1]} for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)


@app.post("/api/messages")
def post_message():
    content = (request.get_json(silent=True) or {}).get("content", "")
    conn = db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO messages (content) VALUES (%s) RETURNING id;",
        (content,),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"id": new_id, "content": content}), 201


if __name__ == "__main__":
    wait_db()
    port = int(os.environ["BACKEND_INTERNAL_PORT"])
    app.run(host="0.0.0.0", port=port)
