
from .constants import POINTS_TO_WIN, TABLE, side_sign
from .state import SimState, is_match_finished, reset_ball, stop_ball

def is_goal_on_side(ball_x: float, side: str) -> bool:
    limit = side_sign(side) * TABLE["halfLength"]
    return ball_x < limit if side == "left" else ball_x > limit

def has_reached_point_limit(score: int) -> bool:
    return score >= POINTS_TO_WIN

def declare_winner(state: SimState, winner: str) -> None:
    state.winner = winner
    stop_ball(state)

def score_on_left_goal(state: SimState) -> None:
    state.score_right += 1
    if has_reached_point_limit(state.score_right):
        declare_winner(state, "right")
        return
    reset_ball(state, toward_right=True)

def score_on_right_goal(state: SimState) -> None:
    state.score_left += 1
    if has_reached_point_limit(state.score_left):
        declare_winner(state, "left")
        return
    reset_ball(state, toward_right=False)

def resolve_goals(state: SimState) -> None:
    if is_match_finished(state):
        return
    if is_goal_on_side(state.ball_x, "left"):
        score_on_left_goal(state)
        return
    if is_goal_on_side(state.ball_x, "right"):
        score_on_right_goal(state)
