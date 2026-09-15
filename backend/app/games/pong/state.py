
import random
from dataclasses import dataclass, field

from .constants import INITIAL_VELOCITY_X, INITIAL_VELOCITY_Z, Side

@dataclass
class SimState:

    ball_x: float = 0.0
    ball_z: float = 0.0
    velocity_x: float = 0.0
    velocity_z: float = 0.0
    left_paddle_offset: float = 0.0
    right_paddle_offset: float = 0.0
    left_paddle_velocity: float = 0.0
    right_paddle_velocity: float = 0.0
    last_left_paddle_input_at: float = 0.0
    last_right_paddle_input_at: float = 0.0
    score_left: int = 0
    score_right: int = 0
    winner: Side | None = field(default=None)

def create_initial_sim_state() -> SimState:
    return SimState(
        velocity_x=INITIAL_VELOCITY_X,
        velocity_z=INITIAL_VELOCITY_Z * _random_velocity_z_sign(),
    )

def _random_velocity_z_sign() -> int:
    return 1 if random.random() > 0.5 else -1

def reset_ball(state: SimState, toward_right: bool) -> None:
    state.ball_x = 0
    state.ball_z = 0
    state.velocity_x = INITIAL_VELOCITY_X if toward_right else -INITIAL_VELOCITY_X
    state.velocity_z = INITIAL_VELOCITY_Z * _random_velocity_z_sign()

def stop_ball(state: SimState) -> None:
    state.ball_x = 0
    state.ball_z = 0
    state.velocity_x = 0
    state.velocity_z = 0

def is_match_finished(state: SimState) -> bool:
    return state.winner is not None

def to_snapshot(state: SimState, timestamp: float) -> dict:
    return {
        "leftPaddleOffset": state.left_paddle_offset,
        "rightPaddleOffset": state.right_paddle_offset,
        "ball": {"x": state.ball_x, "z": state.ball_z},
        "score": {"left": state.score_left, "right": state.score_right},
        "winner": state.winner,
        "timestamp": timestamp,
    }
