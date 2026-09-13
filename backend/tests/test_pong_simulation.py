
import math

from games.pong.collisions import (
    is_ball_in_paddle_hit_zone,
    is_ball_past_border,
    resolve_paddle_collisions,
    resolve_side_borders,
)
from games.pong.constants import (
    BASE_PADDLE_SPEED,
    PADDLE_VELOCITY_DECAY,
    TABLE,
)
from games.pong.paddles import (
    apply_paddle_input,
    decay_paddle_velocities,
    get_paddle_offset,
    get_paddle_velocity,
    set_paddle_offset,
)
from games.pong.scoring import resolve_goals
from games.pong.state import create_initial_sim_state, stop_ball, to_snapshot

def test_rebote_na_borda_clampa_e_inverte():
    state = create_initial_sim_state()
    state.ball_x = 0
    state.velocity_x = 0
    state.ball_z = 4.9
    state.velocity_z = 5

    resolve_side_borders(state)

    limit = TABLE["halfWidth"] - TABLE["ballRadius"]
    assert state.ball_z == limit
    assert state.velocity_z == -5

def test_borda_inferior():
    state = create_initial_sim_state()
    state.velocity_x = 0
    state.ball_z = -4.9
    state.velocity_z = -5

    resolve_side_borders(state)

    limit = TABLE["halfWidth"] - TABLE["ballRadius"]
    assert state.ball_z == -limit
    assert state.velocity_z == 5

def test_hit_na_paddle_direita():
    state = create_initial_sim_state()
    state.velocity_x = 5
    state.ball_x = 9.0
    state.ball_z = 1.0
    state.right_paddle_offset = 1.0

    resolve_paddle_collisions(state)

    assert state.velocity_x == -BASE_PADDLE_SPEED
    assert state.ball_x == TABLE["paddleX"] - TABLE["ballRadius"]
    assert math.isclose(state.velocity_z, 0 * 4.5 + 0 * 0.55)

def test_hit_ratio_transfere_velocidade_da_paddle():
    state = create_initial_sim_state()
    state.velocity_x = 5
    state.ball_x = 9.0
    state.ball_z = 1.0
    state.right_paddle_offset = 1.5
    state.right_paddle_velocity = 10.0

    resolve_paddle_collisions(state)

    expected_vz = -0.5 * 4.5 + 10.0 * 0.55
    assert math.isclose(state.velocity_z, expected_vz)

def test_sem_hit_fora_da_hit_zone():
    state = create_initial_sim_state()
    state.velocity_x = 5
    state.ball_x = 8.0
    state.ball_z = 0
    state.right_paddle_offset = 0

    resolve_paddle_collisions(state)

    assert state.velocity_x == 5

def test_gol_esquerda_ponto_para_direita_e_saque():
    state = create_initial_sim_state()
    state.ball_x = -10.2
    state.score_right = 1

    resolve_goals(state)

    assert state.score_right == 2
    assert state.ball_x == 0
    assert state.velocity_x == 6

def test_quinto_ponto_declara_vencedor():
    state = create_initial_sim_state()
    state.score_left = 4
    state.ball_x = 10.2

    resolve_goals(state)

    assert state.score_left == 5
    assert state.winner == "left"
    assert state.ball_x == 0 and state.ball_z == 0
    assert state.velocity_x == 0 and state.velocity_z == 0

def test_decay_de_paddle():
    state = create_initial_sim_state()
    state.left_paddle_velocity = 4.0

    decay_paddle_velocities(state, 0.1)

    expected = 4.0 * math.exp(-PADDLE_VELOCITY_DECAY * 0.1)
    assert math.isclose(state.left_paddle_velocity, expected)

def test_input_de_paddle_calcula_velocidade():
    state = create_initial_sim_state()

    apply_paddle_input(state, "left", 3.0, 1000.0)
    assert get_paddle_offset(state, "left") == 3.0
    assert get_paddle_velocity(state, "left") == 0.0

    apply_paddle_input(state, "left", 4.0, 1100.0)
    assert get_paddle_velocity(state, "left") == 10.0

def test_set_paddle_offset_atualiza_velocidade():
    state = create_initial_sim_state()

    set_paddle_offset(state, "right", 2.0, 0.2)
    assert get_paddle_velocity(state, "right") == 10.0

def test_input_fora_da_mesa_deixa_passar_sem_crash_clamp_feito_no_handler():
    state = create_initial_sim_state()
    apply_paddle_input(state, "right", 99.0, 500.0)
    assert get_paddle_offset(state, "right") == 99.0

def test_is_ball_past_border_e_hit_zone_limites():
    limit = TABLE["halfWidth"] - TABLE["ballRadius"]
    assert is_ball_past_border(limit + 0.01, "top")
    assert not is_ball_past_border(limit - 0.01, "top")

    face = TABLE["paddleX"]
    assert is_ball_in_paddle_hit_zone(face, "right")
    assert is_ball_in_paddle_hit_zone(face + TABLE["ballRadius"], "right")
    assert not is_ball_in_paddle_hit_zone(face + TABLE["ballRadius"] + 0.01, "right")

def test_to_snapshot_shape_do_protocolo():
    state = create_initial_sim_state()
    state.score_left = 2
    state.score_right = 3

    snap = to_snapshot(state, 1234.5)

    assert snap == {
        "leftPaddleOffset": 0.0,
        "rightPaddleOffset": 0.0,
        "ball": {"x": 0.0, "z": 0.0},
        "score": {"left": 2, "right": 3},
        "winner": None,
        "timestamp": 1234.5,
    }

def test_stop_ball_zera_tudo():
    state = create_initial_sim_state()
    stop_ball(state)
    assert state.ball_x == 0 and state.ball_z == 0
    assert state.velocity_x == 0 and state.velocity_z == 0
