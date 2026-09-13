import type { Side } from "../../../games/pong/protocol/types";
import { TABLE } from "../../../games/pong/protocol/table";

export { TABLE };
export { POINTS_TO_WIN } from "../../../games/pong/protocol/table";

export const INITIAL_VELOCITY_X = 6;
export const INITIAL_VELOCITY_Z = 2;

export const BASE_PADDLE_SPEED = 6;
export const ANGLE_FACTOR = 4.5;
export const PADDLE_MOTION_FACTOR = 0.55;
export const PADDLE_VELOCITY_DECAY = 8;

export const SIDES: Side[] = ["left", "right"];

export type Border = "top" | "bottom";
export const BORDERS: Border[] = ["top", "bottom"];
