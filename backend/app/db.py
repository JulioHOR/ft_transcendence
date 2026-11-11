import os
import threading
import time
from collections.abc import Iterator
from contextlib import closing, contextmanager
from typing import Any, TypeAlias

import psycopg2
from psycopg2.pool import ThreadedConnectionPool

SECRETS_DIR = "/run/secrets"
DB_READY_TIMEOUT_SECONDS = 60

ConnectionParams: TypeAlias = dict[str, Any]


def read_secret(name: str) -> str:
    try:
        with open(f"{SECRETS_DIR}/{name}") as secret_file:
            return secret_file.read().strip()
    except OSError as exc:
        raise RuntimeError(
            f"O segredo {name} não pôde ser lido em {SECRETS_DIR}."
        ) from exc


def _db_kwargs() -> ConnectionParams:
    return {
        "host": os.environ["POSTGRES_HOST"],
        "port": os.environ["POSTGRES_INTERNAL_PORT"],
        "dbname": os.environ["POSTGRES_DB"],
        "user": os.environ["POSTGRES_USER"],
        "password": read_secret("db_password"),
        "options": "-c client_encoding=UTF8",
    }


def open_connection() -> psycopg2.extensions.connection:
    return psycopg2.connect(**_db_kwargs())


_pool_lock = threading.Lock()
_pool: ThreadedConnectionPool | None = None


def _discard_pool(exhausted: ThreadedConnectionPool) -> None:
    global _pool
    with _pool_lock:
        exhausted.closeall()
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
    connection = pool.getconn()
    try:
        with connection, connection.cursor() as cursor:
            yield cursor
    except psycopg2.OperationalError:
        pool.putconn(connection, close=True)
        _discard_pool(pool)
        raise
    except BaseException:
        pool.putconn(connection)
        raise
    else:
        pool.putconn(connection)


def wait_db() -> None:
    for _attempt in range(DB_READY_TIMEOUT_SECONDS):
        try:
            open_connection().close()
            return
        except psycopg2.OperationalError:
            time.sleep(1)
    raise RuntimeError("O banco de dados não ficou pronto a tempo.")


def ensure_schema() -> None:
    with closing(open_connection()) as connection, connection.cursor() as cursor:
        cursor.execute(
            "ALTER TABLE account ADD COLUMN IF NOT EXISTS "
            "session_version INTEGER NOT NULL DEFAULT 0;"
        )
        cursor.execute(
            "ALTER TABLE account ADD COLUMN IF NOT EXISTS "
            "character TEXT NOT NULL DEFAULT 'character';"
        )
