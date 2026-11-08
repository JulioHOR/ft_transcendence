
import random
from dataclasses import dataclass, field
from typing import Any

from .constants import INITIAL_VELOCITY_X, INITIAL_VELOCITY_Z, TABLE, Side, side_sign


@dataclass
class SimState:
    ball_x: float = 0.0
    ball_z: float = 0.0
    velocity_x: float = 0.0
    velocity_z: float = 0.0
    left_paddle_position: float = 0.0
    right_paddle_position: float = 0.0
    left_paddle_velocity: float = 0.0
    right_paddle_velocity: float = 0.0
    last_left_paddle_input_at: float = 0.0
    last_right_paddle_input_at: float = 0.0
    score_left: int = 0
    score_right: int = 0
    winner: Side | None = field(default=None)
    serve_side: Side | None = field(default=None)


def create_initial_sim_state() -> SimState:
    return SimState(
        velocity_x=INITIAL_VELOCITY_X,
        velocity_z=INITIAL_VELOCITY_Z * _random_velocity_z_sign(),
    )


def _random_velocity_z_sign() -> int:
    return 1 if random.random() > 0.5 else -1


def reset_ball(state: SimState, toward_right: bool) -> None:
    state.serve_side = None
    state.ball_x = 0
    state.ball_z = 0
    state.velocity_x = INITIAL_VELOCITY_X if toward_right else -INITIAL_VELOCITY_X
    state.velocity_z = INITIAL_VELOCITY_Z * _random_velocity_z_sign()


def attach_ball_to_paddle(state: SimState, side: Side) -> None:
    state.serve_side = side
    state.ball_x = (
        side_sign(side) * TABLE["paddleX"] - side_sign(side) * TABLE["ballRadius"]
    )
    state.ball_z = get_paddle_position(state, side)
    state.velocity_x = 0.0
    state.velocity_z = 0.0


def update_attached_ball(state: SimState) -> None:
    if state.serve_side is not None:
        attach_ball_to_paddle(state, state.serve_side)


def release_serve(state: SimState) -> bool:
    if state.serve_side is None:
        return False
    toward_right = state.serve_side == "left"
    state.serve_side = None
    state.velocity_x = INITIAL_VELOCITY_X if toward_right else -INITIAL_VELOCITY_X
    state.velocity_z = INITIAL_VELOCITY_Z * _random_velocity_z_sign()
    return True


def get_paddle_position(state: SimState, side: Side) -> float:
    return (
        state.left_paddle_position if side == "left" else state.right_paddle_position
    )


def stop_ball(state: SimState) -> None:
    state.ball_x = 0
    state.ball_z = 0
    state.velocity_x = 0
    state.velocity_z = 0
    state.serve_side = None


def is_match_finished(state: SimState) -> bool:
    return state.winner is not None


def to_snapshot(state: SimState, timestamp: float) -> dict[str, Any]:
    return {
        "leftPaddlePosition": state.left_paddle_position,
        "rightPaddlePosition": state.right_paddle_position,
        "ball": {"x": state.ball_x, "z": state.ball_z},
        "score": {"left": state.score_left, "right": state.score_right},
        "winner": state.winner,
        "serveSide": state.serve_side,
        "timestamp": timestamp,
    }
