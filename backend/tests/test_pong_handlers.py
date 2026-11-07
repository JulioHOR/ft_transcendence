import pytest

from games.pong.handlers import MalformedInput, _parse_input


@pytest.mark.parametrize("position", [float("nan"), float("inf"), -float("inf"), 10**400, True, "2", None])
def test_recusa_posicoes_invalidas(position):
    with pytest.raises(MalformedInput):
        _parse_input({"position": position})


@pytest.mark.parametrize("position", [-2.5, 0, 2.5])
def test_aceita_posicoes_finitas(position):
    assert _parse_input({"position": position}) == position
