
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

    assert mm.join("a") is None
    assert mm.get_match("a") is None

    match = mm.join("b")
    assert match == ("a", "b")
    assert created == [("a", "b")]
    assert mm.get_match("a") is match
    assert mm.get_match("b") is match
    assert mm.get_side("a") == "left"
    assert mm.get_side("b") == "right"

def test_terceiro_fica_na_fila():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a")
    mm.join("b")
    result = mm.join("c")

    assert result is None
    assert created == [("a", "b")]
    assert mm.in_queue("c")
    assert not mm.in_queue("a")

def test_quarto_pareia_com_o_terceiro():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a")
    mm.join("b")
    mm.join("c")
    match = mm.join("d")

    assert match == ("c", "d")
    assert len(created) == 2

def test_leave_remove_da_fila():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a")
    mm.leave("a")

    assert not mm.in_queue("a")
    assert mm.join("b") is None
    assert mm.join("c") == ("b", "c")

def test_join_duplicado_e_recusado():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a")
    with pytest.raises(AlreadyPlayingError):
        mm.join("a")

    mm.join("b")
    with pytest.raises(AlreadyPlayingError):
        mm.join("a")
    with pytest.raises(AlreadyPlayingError):
        mm.join("b")

def test_disconnect_em_fila_nao_quebra():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a")
    mm.leave("a")
    mm.join("b")
    match = mm.join("c")

    assert match == ("b", "c")
    assert created == [("b", "c")]
    assert mm.get_match("a") is None

def test_leave_libera_indices_da_partida():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a")
    mm.join("b")
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

    mm.join("a")
    with pytest.raises(RuntimeError):
        mm.join("b")

    assert mm.in_queue("a") and mm.in_queue("b")

    match = mm.join("c")
    assert match == ("a", "b")
    assert mm.get_side("a") == "left" and mm.get_side("b") == "right"
