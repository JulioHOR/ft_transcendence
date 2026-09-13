
import math

from .constants import PADDLE_VELOCITY_DECAY
from .state import SimState

def get_paddle_offset(state: SimState, side: str) -> float:
    return state.left_paddle_offset if side == "left" else state.right_paddle_offset

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

def set_paddle_offset(
    state: SimState, side: str, offset: float, delta_seconds: float
) -> None:
    previous_offset = get_paddle_offset(state, side)
    velocity = (offset - previous_offset) / delta_seconds if delta_seconds > 0 else 0.0

    if side == "left":
        state.left_paddle_offset = offset
    else:
        state.right_paddle_offset = offset
    set_paddle_velocity(state, side, velocity)

def apply_paddle_input(
    state: SimState, side: str, offset: float, timestamp_ms: float
) -> None:
    last_input_at = get_last_paddle_input_at(state, side)
    delta_seconds = (
        0.0 if last_input_at == 0 else (timestamp_ms - last_input_at) / 1000
    )

    set_paddle_offset(state, side, offset, delta_seconds)
    set_last_paddle_input_at(state, side, timestamp_ms)

def decay_paddle_velocities(state: SimState, delta_seconds: float) -> None:
    decay = math.exp(-PADDLE_VELOCITY_DECAY * delta_seconds)
    state.left_paddle_velocity *= decay
    state.right_paddle_velocity *= decay
