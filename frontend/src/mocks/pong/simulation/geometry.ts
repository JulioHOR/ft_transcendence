import type { Side } from "../../../games/pong/protocol/types";
import type { Border } from "./constants";
import { TABLE } from "./constants";
import type { SimState } from "./types";

export function sideSign(side: Side): number {
  return side === "left" ? -1 : 1;
}

export function borderSign(border: Border): number {
  return border === "top" ? 1 : -1;
}

export function getPaddleOffset(state: SimState, side: Side): number {
  return side === "left" ? state.leftPaddleOffset : state.rightPaddleOffset;
}

export function getPaddleX(side: Side): number {
  return sideSign(side) * TABLE.paddleX;
}
