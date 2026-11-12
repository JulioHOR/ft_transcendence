
from .constants import (
    ANGLE_FACTOR,
    BASE_PADDLE_SPEED,
    BALL_BOUNCE_SPEED,
    BORDERS,
    PADDLE_MOTION_FACTOR,
    SIDES,
    TABLE,
    Border,
    Side,
    border_sign,
    side_sign,
)
from .paddles import get_paddle_position, get_paddle_velocity
from .shared import clamp
from .state import SimState


def does_paddle_overlap_ball(paddle_position: float, ball_z: float) -> bool:
    overlap_distance = TABLE["paddleHalfDepth"] + TABLE["ballRadius"]
    return abs(paddle_position - ball_z) <= overlap_distance


def is_moving_toward_side(velocity_x: float, side: Side) -> bool:
    return velocity_x < 0 if side == "left" else velocity_x > 0


def is_ball_in_paddle_hit_zone(ball_x: float, side: Side) -> bool:
    paddle_face_x = side_sign(side) * TABLE["paddleX"]
    min_x = paddle_face_x - TABLE["ballRadius"]
    max_x = paddle_face_x + TABLE["ballRadius"]
    return min_x <= ball_x <= max_x


def is_hitting_paddle(state: SimState, side: Side) -> bool:
    moving_toward_paddle = is_moving_toward_side(state.velocity_x, side)
    inside_hit_zone = is_ball_in_paddle_hit_zone(state.ball_x, side)
    overlaps_paddle = does_paddle_overlap_ball(
        get_paddle_position(state, side), state.ball_z
    )
    return moving_toward_paddle and inside_hit_zone and overlaps_paddle


def _border_limit(border: Border) -> float:
    return border_sign(border) * (TABLE["halfWidth"] - TABLE["ballRadius"])


def is_ball_past_border(ball_z: float, border: Border) -> bool:
    limit = _border_limit(border)
    return ball_z > limit if border == "top" else ball_z < limit


def bounce_on_border(state: SimState, border: Border) -> None:
    state.ball_z = _border_limit(border)
    state.velocity_z *= -1


def get_paddle_hit_ratio(state: SimState, side: Side) -> float:
    paddle_position = get_paddle_position(state, side)
    raw_ratio = (state.ball_z - paddle_position) / TABLE["paddleHalfDepth"]
    return clamp(raw_ratio, -1, 1)


def place_ball_on_paddle_face(state: SimState, side: Side) -> None:
    state.ball_x = side_sign(side) * (TABLE["paddleX"] - TABLE["ballRadius"])


def apply_paddle_bounce_velocity(state: SimState, side: Side, hit_ratio: float) -> None:
    direction_x = -side_sign(side)
    paddle_motion = get_paddle_velocity(state, side) * PADDLE_MOTION_FACTOR
    max_velocity_z = ANGLE_FACTOR + PADDLE_MOTION_FACTOR * BASE_PADDLE_SPEED

    state.velocity_x = direction_x * BALL_BOUNCE_SPEED
    state.velocity_z = clamp(
        hit_ratio * ANGLE_FACTOR + paddle_motion, -max_velocity_z, max_velocity_z
    )


def bounce_on_paddle(state: SimState, side: Side) -> None:
    hit_ratio = get_paddle_hit_ratio(state, side)
    place_ball_on_paddle_face(state, side)
    apply_paddle_bounce_velocity(state, side, hit_ratio)


def resolve_side_borders(state: SimState) -> None:
    for border in BORDERS:
        if not is_ball_past_border(state.ball_z, border):
            continue
        bounce_on_border(state, border)
        return


def resolve_paddle_collisions(state: SimState) -> None:
    for side in SIDES:
        if not is_hitting_paddle(state, side):
            continue
        bounce_on_paddle(state, side)
        return
