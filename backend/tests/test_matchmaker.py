
from typing import Any

import pytest

from ws_core.matchmaker import AlreadyPlayingError, Matchmaker

def make_factory():
    created = []

    def factory(left_sid: str, right_sid: str) -> Any:
        match = (left_sid, right_sid)
        created.append(match)
        return match

    return factory, created

def test_join_x2_pareia_com_sides_corretos():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    assert mm.join("a", 1) is None
    assert mm.get_match("a") is None

    match = mm.join("b", 2)
    assert match == (1, 2)
    assert created == [(1, 2)]
    assert mm.get_match("a") is match
    assert mm.get_match("b") is match
    assert mm.get_side("a") == "left"
    assert mm.get_side("b") == "right"

def test_terceiro_fica_na_fila():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.join("b", 2)
    result = mm.join("c", 3)

    assert result is None
    assert created == [(1, 2)]
    assert mm.in_queue("c")
    assert not mm.in_queue("a")

def test_quarto_pareia_com_o_terceiro():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.join("b", 2)
    mm.join("c", 3)
    match = mm.join("d", 4)

    assert match == (3, 4)
    assert len(created) == 2

def test_leave_remove_da_fila():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.leave("a")

    assert not mm.in_queue("a")
    assert mm.join("b", 2) is None
    assert mm.join("c", 3) == (2, 3)

def test_join_duplicado_e_recusado():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    with pytest.raises(AlreadyPlayingError):
        mm.join("a", 1)

    mm.join("b", 2)
    with pytest.raises(AlreadyPlayingError):
        mm.join("a", 1)
    with pytest.raises(AlreadyPlayingError):
        mm.join("b", 2)

def test_disconnect_em_fila_nao_quebra():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.leave("a")
    mm.join("b", 2)
    match = mm.join("c", 3)

    assert match == (2, 3)
    assert created == [(2, 3)]
    assert mm.get_match("a") is None

def test_leave_libera_indices_da_partida():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.join("b", 2)
    mm.leave("a")

    assert mm.get_match("a") is None
    assert mm.get_match("b") is not None

def test_falha_da_fabrica_devolve_sids_a_fila():
    created = []
    calls = {"n": 0}

    def flaky_factory(left_sid: str, right_sid: str) -> Any:
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("boom")
        match = (left_sid, right_sid)
        created.append(match)
        return match

    mm = Matchmaker(flaky_factory)

    mm.join("a", 1)
    with pytest.raises(RuntimeError):
        mm.join("b", 2)

    assert mm.in_queue("a") and mm.in_queue("b")

    match = mm.join("c", 3)
    assert match == (1, 2)
    assert mm.get_side("a") == "left" and mm.get_side("b") == "right"


def test_reconectar_usuario_substitui_sid_e_preserva_lado():
    class FakeMatch:
        id = "match-1"
        phase = "paused"

        def __init__(self, left_user_id, right_user_id):
            self.sides = {left_user_id: "left", right_user_id: "right"}

    created = []

    def make_match(left_sid, right_sid):
        match = FakeMatch(left_sid, right_sid)
        created.append(match)
        return match

    mm = Matchmaker(make_match)
    mm.join("old-left", 1)
    mm.join("right", 2)
    match = created[0]

    assert mm.reconnect_user(1, "new-left") is match
    assert mm.get_match("old-left") is None
    assert mm.get_match("new-left") is match
    assert mm.get_side("new-left") == "left"
    assert mm.get_user_id_for_sid("new-left") == 1
    assert match.sides == {1: "left", 2: "right"}
