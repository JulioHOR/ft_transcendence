import type { Side } from "../../../games/pong/protocol/types";
import { PADDLE_VELOCITY_DECAY } from "./constants";
import { getPaddleOffset } from "./geometry";
import type { SimState } from "./types";

function setPaddleVelocity(state: SimState, side: Side, velocity: number): void {
  if (side === "left") {
    state.leftPaddleVelocity = velocity;
    return;
  }
  state.rightPaddleVelocity = velocity;
}

function setLastPaddleInputAt(
  state: SimState,
  side: Side,
  timestampMs: number,
): void {
  if (side === "left") {
    state.lastLeftPaddleInputAt = timestampMs;
    return;
  }
  state.lastRightPaddleInputAt = timestampMs;
}

function getLastPaddleInputAt(state: SimState, side: Side): number {
  return side === "left"
    ? state.lastLeftPaddleInputAt
    : state.lastRightPaddleInputAt;
}

export function getPaddleVelocity(state: SimState, side: Side): number {
  return side === "left" ? state.leftPaddleVelocity : state.rightPaddleVelocity;
}

export function setPaddleOffset(
  state: SimState,
  side: Side,
  offset: number,
  deltaSeconds: number,
): void {
  const previousOffset = getPaddleOffset(state, side);
  const velocity =
    deltaSeconds > 0 ? (offset - previousOffset) / deltaSeconds : 0;

  if (side === "left") {
    state.leftPaddleOffset = offset;
  } else {
    state.rightPaddleOffset = offset;
  }
  setPaddleVelocity(state, side, velocity);
}

export function applyPaddleInput(
  state: SimState,
  side: Side,
  offset: number,
  timestampMs: number,
): void {
  const lastInputAt = getLastPaddleInputAt(state, side);
  const deltaSeconds =
    lastInputAt === 0 ? 0 : (timestampMs - lastInputAt) / 1000;

  setPaddleOffset(state, side, offset, deltaSeconds);
  setLastPaddleInputAt(state, side, timestampMs);
}

export function decayPaddleVelocities(
  state: SimState,
  deltaSeconds: number,
): void {
  const decay = Math.exp(-PADDLE_VELOCITY_DECAY * deltaSeconds);
  state.leftPaddleVelocity *= decay;
  state.rightPaddleVelocity *= decay;
}
