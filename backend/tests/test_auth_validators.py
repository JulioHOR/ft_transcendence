import pytest

from auth.validators import normalize_email, validate_signup

GOOD = {"email": "alice@example.com", "nickname": "alice_9", "password": "senha-forte-123"}

def test_campos_validos_passam():
    assert validate_signup(**GOOD) is None

@pytest.mark.parametrize("email", ["", "alice", "alice@", "@example.com", "alice@example", "a b@example.com", "alice @example.com"])
def test_email_invalido(email):
    assert validate_signup(**{**GOOD, "email": email}) == "email inválido"

def test_normaliza_email():
    assert normalize_email("  AliCe@Example.COM ") == "alice@example.com"

@pytest.mark.parametrize("nickname", ["", "al", "a" * 21])
def test_nickname_fora_da_faixa(nickname):
    assert validate_signup(**{**GOOD, "nickname": nickname}) == (
        "nickname deve ter entre 3 e 20 caracteres"
    )

@pytest.mark.parametrize("nickname", ["alice-b", "alice.b", "alice@x", "alice!", "alice b", "alicé"])
def test_nickname_caractere_invalido(nickname):
    assert validate_signup(**{**GOOD, "nickname": nickname}) == (
        "nickname aceita apenas letras, números e _"
    )

@pytest.mark.parametrize("nickname", ["abc", "a_1", "a" * 20])
def test_nickname_valido(nickname):
    assert validate_signup(**{**GOOD, "nickname": nickname}) is None

@pytest.mark.parametrize("password", ["", "a" * 7])
def test_senha_curta(password):
    assert validate_signup(**{**GOOD, "password": password}) == (
        "senha deve ter pelo menos 8 caracteres"
    )

def test_senha_no_minimo_exato_passa():
    assert validate_signup(**{**GOOD, "password": "a" * 8}) is None
