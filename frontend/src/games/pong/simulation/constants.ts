import type { Side } from "../transport/types";

export const TABLE = {
  halfLength: 10,
  halfWidth: 5,
  paddleX: 9,
  paddleHalfDepth: 1,
  ballRadius: 0.35,
} as const;

export const POINTS_TO_WIN = 5;

export const INITIAL_VELOCITY_X = 6;
export const INITIAL_VELOCITY_Z = 3;

export const SPEED_GAIN_ON_HIT = 1.06;
export const MAX_BALL_SPEED = 10;
export const ANGLE_FACTOR = 8;

export const SIDES: Side[] = ["left", "right"];

export type Border = "top" | "bottom";
export const BORDERS: Border[] = ["top", "bottom"];
