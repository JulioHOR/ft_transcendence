

def move_ball(state, delta_seconds: float) -> None:
    state.ball_x += state.velocity_x * delta_seconds
    state.ball_z += state.velocity_z * delta_seconds
