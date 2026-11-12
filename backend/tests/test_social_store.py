from contextlib import contextmanager

import social.store as store


class FakeCursor:
    def __init__(self):
        self.query = ""
        self.params = ()

    def execute(self, query, params):
        self.query = query
        self.params = params

    def fetchone(self):
        return (1,)


def test_message_in_conversation_accepts_either_message_direction(monkeypatch):
    cursor = FakeCursor()

    @contextmanager
    def fake_db_cursor():
        yield cursor

    monkeypatch.setattr(store, "db_cursor", fake_db_cursor)

    assert store.message_in_conversation(2, 1, "42")
    assert cursor.params == (42, 2, 1, 1, 2)
    assert "OR (chat_message.sender_id = %s" in cursor.query


def test_message_in_conversation_rejects_non_numeric_id(monkeypatch):
    def unexpected_db_access():
        raise AssertionError("A consulta não deve acessar o banco.")

    monkeypatch.setattr(store, "db_cursor", unexpected_db_access)

    assert not store.message_in_conversation(2, 1, "invalid")
