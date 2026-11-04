
import threading
import time

from games.pong.match import PongMatch
from games.pong.state import create_initial_sim_state


class FakeBroadcaster:

    def __init__(self):
        self.events = []
        self.lock = threading.Lock()

    def __call__(self, match_id, event, payload):
        with self.lock:
            self.events.append((match_id, event, payload))


def make_match(countdown_seconds=0.05):
    bc = FakeBroadcaster()
    match = PongMatch(1, 2, bc, countdown_seconds=countdown_seconds)
    return match, bc


def test_nasce_em_countdown_e_passa_a_playing():
    match, bc = make_match(countdown_seconds=0.05)
    try:
        assert match.phase == "countdown"
        assert match.sides == {1: "left", 2: "right"}
        time.sleep(0.2)
        assert match.phase == "playing"
        with bc.lock:
            statuses = [p for _, ev, p in bc.events if ev == "game:status"]
            snaps = [p for _, ev, p in bc.events if ev == "game:snapshot"]
        assert any(s.get("state") == "playing" for s in statuses)
        assert len(snaps) >= 3
    finally:
        match.destroy()


def test_timestamps_aumentam():
    match, bc = make_match()
    try:
        time.sleep(0.25)
        with bc.lock:
            stamps = [p["timestamp"] for _, ev, p in bc.events if ev == "game:snapshot"]
        assert stamps == sorted(stamps)
        assert len(stamps) >= 3
    finally:
        match.destroy()


def test_apply_input_lado_proprio_e_recusa_sid_estranho():
    match, _ = make_match(countdown_seconds=0)
    try:
        time.sleep(0.05)
        assert match.apply_input(1, 2.0, 1000.0)
        assert match.sim.left_paddle_position == 2.0
        assert not match.apply_input(99, 5.0, 1100.0)
    finally:
        match.destroy()


def test_input_recusado_em_countdown_e_apos_fim():
    match, _ = make_match(countdown_seconds=5)
    try:
        assert match.phase == "countdown"
        assert not match.apply_input(1, 3.0, 2000.0)
        match.sim = create_initial_sim_state()
        match.sim.winner = "left"
        match.phase = "finished"
        assert not match.apply_input(1, 3.0, 2000.0)
    finally:
        match.destroy()


def test_rematch_exige_aceitacao_dos_dois():
    match, _ = make_match(countdown_seconds=0.05)
    try:
        match.sim.winner = "right"
        match.phase = "finished"

        assert match.accept_rematch(1) == "pending"
        assert match.accepted_sides() == {"left": True, "right": False}
        assert match.phase == "finished"

        assert match.accept_rematch(1) == "pending"
        assert match.accepted_sides() == {"left": True, "right": False}

        assert match.accept_rematch(2) == "countdown"
        assert match.phase == "countdown"
        assert match.sim.winner is None
    finally:
        match.destroy()


def test_rematch_recusado_antes_do_fim():
    match, _ = make_match(countdown_seconds=0)
    try:
        time.sleep(0.05)
        assert match.accept_rematch(1) == "rejected"
    finally:
        match.destroy()


def test_retomar_partida_exige_aceitacao_dos_dois_lados():
    match, _ = make_match(countdown_seconds=0)
    try:
        time.sleep(0.05)
        match.pause()

        assert match.accept_resume(1) == "pending"
        assert match.accepted_sides() == {"left": True, "right": False}
        assert match.phase == "paused"

        assert match.accept_resume(2) == "resumed"
        assert match.phase == "playing"
        assert match.accepted_sides() == {"left": False, "right": False}
    finally:
        match.destroy()


def test_nova_desconexao_limpa_aceites_de_retomada():
    match, _ = make_match(countdown_seconds=0)
    try:
        time.sleep(0.05)
        match.pause()
        assert match.accept_resume(1) == "pending"

        match.pause()

        assert match.accepted_sides() == {"left": False, "right": False}
    finally:
        match.destroy()


def test_destroy_encerra_thread():
    match, _ = make_match(countdown_seconds=0)
    thread = match._thread
    assert thread.is_alive()
    match.destroy()
    assert not thread.is_alive()
    match.destroy()


def test_fase_finished_para_o_step_mas_continua_broadcast():
    match, bc = make_match(countdown_seconds=0)
    try:
        time.sleep(0.05)
        match.sim.winner = "left"
        match.phase = "finished"
        ball_x_before = match.sim.ball_x
        time.sleep(0.2)
        assert match.phase == "finished"
        assert match.sim.ball_x == ball_x_before
        with bc.lock:
            count = sum(1 for _, ev, _ in bc.events if ev == "game:snapshot")
        assert count >= 3
    finally:
        match.destroy()
