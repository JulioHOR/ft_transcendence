
from .collisions import resolve_paddle_collisions, resolve_side_borders
from .motion import move_ball
from .paddles import decay_paddle_velocities
from .scoring import resolve_goals
from .state import SimState, is_match_finished

def step_simulation(state: SimState, delta_seconds: float) -> None:
    if is_match_finished(state):
        return

    decay_paddle_velocities(state, delta_seconds)
    move_ball(state, delta_seconds)
    resolve_side_borders(state)
    resolve_paddle_collisions(state)
    resolve_goals(state)
