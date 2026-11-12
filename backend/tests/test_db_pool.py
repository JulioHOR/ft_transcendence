import threading

import psycopg2
import pytest

import db as db_module


class FakeCursor:
    def __init__(self, conn):
        self._conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        if self._conn.fail:
            raise psycopg2.OperationalError("dead")


class FakeConnection:
    def __init__(self, fail=False):
        self.fail = fail
        self.closed = False

    def cursor(self):
        return FakeCursor(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def close(self):
        self.closed = True


class FakePool:
    instances = []
    closeall_count = 0

    def __init__(self, minconn, maxconn, **kwargs):
        self.minconn = minconn
        self.maxconn = maxconn
        self.fail = not FakePool.instances
        FakePool.instances.append(self)
        self.borrowed = []

    def getconn(self):
        conn = FakeConnection(fail=self.fail)
        self.borrowed.append(conn)
        return conn

    def putconn(self, conn, close=False):
        if close:
            conn.closed = True
        if conn in self.borrowed:
            self.borrowed.remove(conn)

    def closeall(self):
        type(self).closeall_count += 1
        for conn in list(self.borrowed):
            conn.closed = True
        self.borrowed.clear()


@pytest.fixture
def fake_pool(monkeypatch):
    FakePool.instances = []
    FakePool.closeall_count = 0
    monkeypatch.setattr(db_module, "ThreadedConnectionPool", FakePool)
    monkeypatch.setattr(db_module, "_db_kwargs", lambda: {})
    monkeypatch.setattr(db_module, "_pool", None)
    yield FakePool
    monkeypatch.setattr(db_module, "_pool", None)


def test_pool_instancia_unica_com_maxconn_32(fake_pool):
    barrier = threading.Barrier(16)
    results = []
    lock = threading.Lock()

    def worker():
        barrier.wait()
        pool = db_module._get_pool()
        with lock:
            results.append(pool)

    threads = [threading.Thread(target=worker) for _ in range(16)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(results) == 16
    assert len(fake_pool.instances) == 1
    assert fake_pool.instances[0].maxconn == 32


def test_operational_error_reconstrui_pool(fake_pool):
    with pytest.raises(psycopg2.OperationalError):
        with db_module.db_cursor() as cur:
            cur.execute("SELECT 1;")

    assert FakePool.closeall_count == 1
    assert len(fake_pool.instances) == 1
    assert db_module._pool is None

    with db_module.db_cursor() as cur:
        cur.execute("SELECT 1;")

    assert len(fake_pool.instances) == 2


def test_ensure_schema_commits_the_migration(monkeypatch):
    class SchemaCursor:
        def __init__(self):
            self.statements = []

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, statement):
            self.statements.append(statement)

    class SchemaConnection:
        def __init__(self):
            self.cursor_instance = SchemaCursor()
            self.entered = False
            self.committed = False
            self.closed = False

        def cursor(self):
            return self.cursor_instance

        def __enter__(self):
            self.entered = True
            return self

        def __exit__(self, *args):
            self.committed = True
            return False

        def close(self):
            self.closed = True

    connection = SchemaConnection()
    monkeypatch.setattr(db_module, "open_connection", lambda: connection)

    db_module.ensure_schema()

    assert connection.entered
    assert connection.committed
    assert connection.closed
    assert len(connection.cursor_instance.statements) == 2
