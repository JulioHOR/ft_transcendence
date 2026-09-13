
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

def make_match():
    bc = FakeBroadcaster()
    match = PongMatch("sidA", "sidB", bc)
    return match, bc

def test_nasce_pareada_com_sides_e_emitindo():
    match, bc = make_match()
    try:
        time.sleep(0.2)
        assert match.sides == {"sidA": "left", "sidB": "right"}
        assert match.phase == "playing"
        with bc.lock:
            snaps = [p for _, ev, p in bc.events if ev == "game:snapshot"]
        assert len(snaps) >= 3
        assert all(s["timestamp"] > 0 for s in snaps)
    finally:
        match.destroy()

def test_timestamps_aumentam():
    match, bc = make_match()
    try:
        time.sleep(0.2)
        with bc.lock:
            stamps = [p["timestamp"] for _, ev, p in bc.events if ev == "game:snapshot"]
        assert stamps == sorted(stamps)
    finally:
        match.destroy()

def test_apply_input_lado_proprio_e_recusa_sid_estranho():
    match, _ = make_match()
    try:
        assert match.apply_input("sidA", 2.0, 1000.0)
        assert match.sim.left_paddle_offset == 2.0

        assert not match.apply_input("sidDesconhecido", 5.0, 1100.0)
        assert match.sim.right_paddle_offset == 0.0
    finally:
        match.destroy()

def test_input_apos_fim_e_recusado():
    match, _ = make_match()
    match.sim = create_initial_sim_state()
    match.sim.score_left = 5
    match.sim.winner = "left"
    match.phase = "finished"

    assert not match.apply_input("sidA", 3.0, 2000.0)
    match.destroy()

def test_restart_somente_apos_fim():
    match, _ = make_match()
    try:
        assert not match.restart()

        match.sim.score_right = 5
        match.sim.winner = "right"
        match.phase = "finished"

        assert match.restart()
        assert match.phase == "playing"
        assert match.sim.score_left == 0 and match.sim.score_right == 0
        assert match.sim.winner is None
        assert match.sim.velocity_x != 0
    finally:
        match.destroy()

def test_destroy_encerra_thread():
    match, _ = make_match()
    thread = match._thread
    assert thread.is_alive()

    match.destroy()

    assert not thread.is_alive()
    match.destroy()

def test_fase_finished_para_o_step_mas_continua_broadcast():
    match, bc = make_match()
    try:
        match.sim.score_left = 5
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
