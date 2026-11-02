
import pytest

from ws_core.matchmaker import AlreadyPlayingError, Matchmaker

def make_factory():
    created = []

    def factory(left_user_id: int, right_user_id: int):
        match = FakeMatch(left_user_id, right_user_id)
        created.append(match)
        return match

    return factory, created


class FakeMatch:
    phase = "playing"

    def __init__(self, left_user_id, right_user_id):
        self.sides = {left_user_id: "left", right_user_id: "right"}


def test_join_x2_pareia_com_sides_corretos():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    assert mm.join("a", 1) is None
    assert mm.get_match("a") is None

    match = mm.join("b", 2)
    assert match is created[0]
    assert list(match.sides) == [1, 2]
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
    assert len(created) == 1
    assert mm.in_queue("c")
    assert not mm.in_queue("a")

def test_quarto_pareia_com_o_terceiro():
    factory, created = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.join("b", 2)
    mm.join("c", 3)
    match = mm.join("d", 4)

    assert list(match.sides) == [3, 4]
    assert len(created) == 2

def test_leave_remove_da_fila():
    factory, _ = make_factory()
    mm = Matchmaker(factory)

    mm.join("a", 1)
    mm.leave("a")

    assert not mm.in_queue("a")
    assert mm.join("b", 2) is None
    assert list(mm.join("c", 3).sides) == [2, 3]

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

    assert list(match.sides) == [2, 3]
    assert len(created) == 1
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

    def flaky_factory(left_user_id: int, right_user_id: int):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("boom")
        match = FakeMatch(left_user_id, right_user_id)
        created.append(match)
        return match

    mm = Matchmaker(flaky_factory)

    mm.join("a", 1)
    with pytest.raises(RuntimeError):
        mm.join("b", 2)

    assert mm.in_queue("a") and mm.in_queue("b")

    match = mm.join("c", 3)
    assert list(match.sides) == [1, 2]
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

def test_convite_expirado_sai_do_inventario():
    factory, _created = make_factory()
    mm = Matchmaker(factory)
    invitation_id = mm.create_game_invitation(1, 2)
    invitation = mm._game_invitations[invitation_id]
    invitation.created_at_ms = 0.0

    assert mm.game_invitations_for_user(1) == []
    assert mm.accepted_game_invitation_for_user(2) is None
    assert invitation_id not in mm._game_invitations

def test_convite_criado_recentemente_permanece():
    factory, _created = make_factory()
    mm = Matchmaker(factory)
    invitation_id = mm.create_game_invitation(1, 2)

    assert len(mm.game_invitations_for_user(1)) == 1
    assert mm.accepted_game_invitation_for_user(2) is None
    assert mm._game_invitations[invitation_id].created_at_ms > 0

def test_cancelar_convite_de_usuario_lanca_e_limpa_sem_side_preservado():
    factory, _created = make_factory()
    mm = Matchmaker(factory)
    invitation_id = mm.create_game_invitation(1, 2)
    event = mm.respond_game_invitation(invitation_id, 2, True)
    mm.join_invitation("sid-1", 1, invitation_id)

    payloads = mm.cancel_invitations_for_user(2)

    assert [payload["inviteId"] for payload in payloads] == [invitation_id]
    assert payloads[0]["senderId"] == 1
    assert payloads[0]["recipientId"] == 2
    assert payloads[0]["waitingUserIds"] == [1]
    assert mm.game_invitation(invitation_id) is None
    assert mm.get_user_id_for_sid("sid-1") == 1

def test_cancelar_convites_para_usuario_sem_convite_devolve_lista_vazia():
    factory, _created = make_factory()
    mm = Matchmaker(factory)

    assert mm.cancel_invitations_for_user(9) == []

def test_cancel_manual_preserva_mapeamento_do_aguardando():
    factory, _created = make_factory()
    mm = Matchmaker(factory)
    invitation_id = mm.create_game_invitation(1, 2)
    mm.respond_game_invitation(invitation_id, 2, True)
    mm.join_invitation("sid-1", 1, invitation_id)

    event = mm.cancel_game_invitation(invitation_id, 1)

    assert event["waitingUserIds"] == [1]
    assert mm.get_user_id_for_sid("sid-1") == 1
    assert mm.get_match("sid-1") is None

def test_join_recusa_usuario_em_match_sem_sid():
    factory, created = make_factory()
    mm = Matchmaker(factory)
    mm.join("a", 1)
    mm.join("b", 2)
    mm._sid_by_user_id.pop(1)

    with pytest.raises(AlreadyPlayingError):
        mm.join("c", 1)

def test_claim_stale_match_move_registros_de_ambos_lados():
    factory, created = make_factory()
    mm = Matchmaker(factory)
    mm.join("a", 1)
    mm.join("b", 2)
    match = created[0]

    assert mm.claim_stale_match("a", 1, match) is True
    assert mm.get_match("a") is None
    assert mm.get_match("b") is None
    assert mm.get_user_id_for_sid("a") is None
    assert mm.get_user_id_for_sid("b") is None
    assert 1 not in mm._match_by_user_id
    assert 2 not in mm._match_by_user_id

def test_claim_stale_match_falha_apos_reconexão():
    factory, created = make_factory()
    mm = Matchmaker(factory)
    mm.join("a", 1)
    mm.join("b", 2)
    match = created[0]
    match.phase = "paused"
    mm.reconnect_user(1, "new-a")
    match.phase = "playing"

    assert mm.claim_stale_match("a", 1, match) is False
    assert mm.get_user_id_for_sid("new-a") == 1
    assert mm.get_match("new-a") is match

def test_reconecta_somente_com_sid_antigo_morto():
    factory, created = make_factory()
    mm = Matchmaker(factory)
    mm.join("old", 1)
    mm.join("peer", 2)
    match = created[0]
    match.phase = "paused"

    assert mm.reconnect_user(1, "tab2", lambda _sid: True) is None
    assert mm.get_match("old") is match

    assert mm.reconnect_user(1, "tab2", lambda _sid: False) is match
    assert mm.get_user_id_for_sid("tab2") == 1

def test_in_queue_aceita_aguardando_convite():
    factory, _created = make_factory()
    mm = Matchmaker(factory)
    invitation_id = mm.create_game_invitation(1, 2)
    mm.respond_game_invitation(invitation_id, 2, True)
    mm.join_invitation("sid-1", 1, invitation_id)

    assert mm.in_queue("sid-1") is True
    assert mm.in_queue("outro") is False

def test_in_queue_falso_sem_sid():
    factory, _created = make_factory()
    mm = Matchmaker(factory)

    assert mm.in_queue("ninguem") is False
