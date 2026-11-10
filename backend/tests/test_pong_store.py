import time
from contextlib import contextmanager

import psycopg2
import pytest

from games.pong import store


class FakeCursor:
    def __init__(self, store_recorder, fail_forever=False):
        self._recorder = store_recorder
        self._fail_forever = fail_forever

    def execute(self, sql, params=None):
        self._recorder.append((sql, params))
        if self._fail_forever or len(self._recorder) < 3:
            raise psycopg2.OperationalError("dead")

    def fetchone(self):
        return None

    def fetchall(self):
        return []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def test_salvar_partida_tenta_ate_lograr(monkeypatch):
    inserts = []
    sleeps = []

    @contextmanager
    def fake_cursor():
        yield FakeCursor(inserts)

    monkeypatch.setattr(store, "db_cursor", fake_cursor)
    monkeypatch.setattr(time, "sleep", sleeps.append)

    store.save_match(
        "match-1", 1, 2, 1, 3, 1,
    )

    assert len(inserts) == 3
    assert inserts[0][0] == inserts[2][0]
    assert sleeps == [0.2, 0.5]


def test_salvar_partida_desiste_apos_tres_tentativas(monkeypatch):
    inserts = []

    @contextmanager
    def fake_cursor():
        yield FakeCursor(inserts, fail_forever=True)

    monkeypatch.setattr(store, "db_cursor", fake_cursor)
    monkeypatch.setattr(time, "sleep", lambda _s: None)

    with pytest.raises(psycopg2.OperationalError):
        store.save_match("match-2", 1, 2, 2, 0, 3)

    assert len(inserts) == 3
