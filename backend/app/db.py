import os
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
        raise RuntimeError(f"secret {name} não legível") from exc


def _db_kwargs() -> dict:
    return {
        "host": os.environ["POSTGRES_HOST"],
        "port": os.environ["POSTGRES_INTERNAL_PORT"],
        "dbname": os.environ["POSTGRES_DB"],
        "user": os.environ["POSTGRES_USER"],
        "password": read_secret("db_password"),
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
