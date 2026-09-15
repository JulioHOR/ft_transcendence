Side = str

TABLE = {
    "halfLength": 10,
    "halfWidth": 5,
    "paddleX": 9,
    "paddleHalfDepth": 1,
    "ballRadius": 0.35,
}

POINTS_TO_WIN = 5

INITIAL_VELOCITY_X = 6
INITIAL_VELOCITY_Z = 2

BASE_PADDLE_SPEED = 6
ANGLE_FACTOR = 4.5
PADDLE_MOTION_FACTOR = 0.55
PADDLE_VELOCITY_DECAY = 8

SIDES = ("left", "right")

BORDERS = ("top", "bottom")

def side_sign(side: str) -> int:
    return -1 if side == "left" else 1

def border_sign(border: str) -> int:
    return 1 if border == "top" else -1
