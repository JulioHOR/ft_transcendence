import os
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool


def read_secret(name: str) -> str:
    try:
        with open(f"/run/secrets/{name}") as f:
            return f.read().strip()
    except OSError as exc:
        raise RuntimeError(f"O segredo {name} não pôde ser lido em /run/secrets.") from exc


def _db_kwargs() -> dict:
    return {
        "host": os.environ["POSTGRES_HOST"],
        "port": os.environ["POSTGRES_INTERNAL_PORT"],
        "dbname": os.environ["POSTGRES_DB"],
        "user": os.environ["POSTGRES_USER"],
        "password": read_secret("db_password"),
        "options": "-c client_encoding=UTF8",
    }


def db():
    return psycopg2.connect(**_db_kwargs())


_pool_lock = threading.Lock()
_pool: ThreadedConnectionPool | None = None


def _rebuild_pool(pool: ThreadedConnectionPool) -> None:
    global _pool
    with _pool_lock:
        pool.closeall()
        _pool = None


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = ThreadedConnectionPool(1, 32, **_db_kwargs())
        return _pool


@contextmanager
def db_cursor() -> Iterator[psycopg2.extensions.cursor]:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn, conn.cursor() as cur:
            yield cur
    except psycopg2.OperationalError:
        pool.putconn(conn, close=True)
        _rebuild_pool(pool)
        raise
    except BaseException:
        pool.putconn(conn)
        raise
    else:
        pool.putconn(conn)


def wait_db():
    for _ in range(60):
        try:
            conn = db()
            conn.close()
            return
        except psycopg2.OperationalError:
            time.sleep(1)
    raise RuntimeError("O banco de dados não ficou pronto a tempo.")


def ensure_schema():
    conn = db()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "session_version INTEGER NOT NULL DEFAULT 0;"
            )
    finally:
        conn.close()
