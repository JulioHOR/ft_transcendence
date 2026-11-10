import importlib

import pytest


def _reload(monkeypatch, api_key):
    monkeypatch.setenv("API_KEY", api_key)
    import api_key as module

    return importlib.reload(module)


def test_importo_falha_com_chave_vazia(monkeypatch):
    with pytest.raises(RuntimeError):
        _reload(monkeypatch, "")


def test_importo_falha_com_tamanho_invalido(monkeypatch):
    with pytest.raises(RuntimeError):
        _reload(monkeypatch, "0" * 32)


def test_chave_valida(monkeypatch):
    module = _reload(monkeypatch, "a" * 64)
    assert module.has_valid_api_key("a" * 64) is True


def test_chave_invalidas(monkeypatch):
    module = _reload(monkeypatch, "a" * 64)
    assert module.has_valid_api_key("") is False
    assert module.has_valid_api_key(None) is False
    assert module.has_valid_api_key("b" * 64) is False
