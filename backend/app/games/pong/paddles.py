
import math

from .constants import BASE_PADDLE_SPEED, PADDLE_VELOCITY_DECAY
from .shared import clamp
from .state import SimState

PADDLE_DELTA_FLOOR_SECONDS = 1 / 60

def get_paddle_position(state: SimState, side: str) -> float:
    return state.left_paddle_position if side == "left" else state.right_paddle_position

def set_paddle_velocity(state: SimState, side: str, velocity: float) -> None:
    if side == "left":
        state.left_paddle_velocity = velocity
    else:
        state.right_paddle_velocity = velocity

def get_paddle_velocity(state: SimState, side: str) -> float:
    return (
        state.left_paddle_velocity if side == "left" else state.right_paddle_velocity
    )

def set_last_paddle_input_at(state: SimState, side: str, timestamp_ms: float) -> None:
    if side == "left":
        state.last_left_paddle_input_at = timestamp_ms
    else:
        state.last_right_paddle_input_at = timestamp_ms

def get_last_paddle_input_at(state: SimState, side: str) -> float:
    return (
        state.last_left_paddle_input_at
        if side == "left"
        else state.last_right_paddle_input_at
    )

def set_paddle_position(
    state: SimState, side: str, position: float, delta_seconds: float
) -> None:
    previous_position = get_paddle_position(state, side)
    if delta_seconds <= 0:
        velocity = 0.0
    else:
        velocity = (position - previous_position) / max(
            delta_seconds, PADDLE_DELTA_FLOOR_SECONDS
        )
        velocity = clamp(velocity, -BASE_PADDLE_SPEED, BASE_PADDLE_SPEED)

    if side == "left":
        state.left_paddle_position = position
    else:
        state.right_paddle_position = position
    set_paddle_velocity(state, side, velocity)

def apply_paddle_input(
    state: SimState, side: str, position: float, timestamp_ms: float
) -> None:
    last_input_at = get_last_paddle_input_at(state, side)
    delta_seconds = (
        0.0 if last_input_at == 0 else (timestamp_ms - last_input_at) / 1000
    )

    set_paddle_position(state, side, position, delta_seconds)
    set_last_paddle_input_at(state, side, timestamp_ms)

def decay_paddle_velocities(state: SimState, delta_seconds: float) -> None:
    decay = math.exp(-PADDLE_VELOCITY_DECAY * delta_seconds)
    state.left_paddle_velocity *= decay
    state.right_paddle_velocity *= decay
