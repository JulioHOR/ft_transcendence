import type { Side } from "../../../games/pong/protocol/types";
import { clamp } from "../../../games/pong/shared/math";
import {
  ANGLE_FACTOR,
  BASE_PADDLE_SPEED,
  BORDERS,
  PADDLE_MOTION_FACTOR,
  SIDES,
  TABLE,
  type Border,
} from "./constants";
import {
  borderSign,
  getPaddleOffset,
  sideSign,
} from "./geometry";
import { getPaddleVelocity } from "./paddles";
import type { SimState } from "./types";

function doesPaddleOverlapBall(paddleOffset: number, ballZ: number): boolean {
  const overlapDistance = TABLE.paddleHalfDepth + TABLE.ballRadius;
  return Math.abs(paddleOffset - ballZ) <= overlapDistance;
}

function isMovingTowardSide(velocityX: number, side: Side): boolean {
  return side === "left" ? velocityX < 0 : velocityX > 0;
}

function isBallInPaddleHitZone(ballX: number, side: Side): boolean {
  const paddleFaceX = sideSign(side) * TABLE.paddleX;
  const minX = paddleFaceX - TABLE.ballRadius;
  const maxX = paddleFaceX + TABLE.ballRadius;
  return ballX >= minX && ballX <= maxX;
}

function isHittingPaddle(state: SimState, side: Side): boolean {
  const movingTowardPaddle = isMovingTowardSide(state.velocityX, side);
  const insideHitZone = isBallInPaddleHitZone(state.ballX, side);
  const overlapsPaddle = doesPaddleOverlapBall(
    getPaddleOffset(state, side),
    state.ballZ,
  );
  return movingTowardPaddle && insideHitZone && overlapsPaddle;
}

function isBallPastBorder(ballZ: number, border: Border): boolean {
  const limit = borderSign(border) * (TABLE.halfWidth - TABLE.ballRadius);
  return border === "top" ? ballZ > limit : ballZ < limit;
}

function bounceOnBorder(state: SimState, border: Border): void {
  state.ballZ = borderSign(border) * (TABLE.halfWidth - TABLE.ballRadius);
  state.velocityZ *= -1;
}

function getPaddleHitRatio(state: SimState, side: Side): number {
  const paddleOffset = getPaddleOffset(state, side);
  const rawRatio = (state.ballZ - paddleOffset) / TABLE.paddleHalfDepth;
  return clamp(rawRatio, -1, 1);
}

function placeBallOnPaddleFace(state: SimState, side: Side): void {
  const paddleFaceX = sideSign(side) * TABLE.paddleX;
  state.ballX = paddleFaceX - sideSign(side) * TABLE.ballRadius;
}

function applyPaddleBounceVelocity(
  state: SimState,
  side: Side,
  hitRatio: number,
): void {
  const directionX = side === "left" ? 1 : -1;
  const paddleMotion = getPaddleVelocity(state, side) * PADDLE_MOTION_FACTOR;

  state.velocityX = directionX * BASE_PADDLE_SPEED;
  state.velocityZ = hitRatio * ANGLE_FACTOR + paddleMotion;
}

function bounceOnPaddle(state: SimState, side: Side): void {
  const hitRatio = getPaddleHitRatio(state, side);
  placeBallOnPaddleFace(state, side);
  applyPaddleBounceVelocity(state, side, hitRatio);
}

export function resolveSideBorders(state: SimState): void {
  for (const border of BORDERS) {
    if (!isBallPastBorder(state.ballZ, border)) continue;
    bounceOnBorder(state, border);
    return;
  }
}

export function resolvePaddleCollisions(state: SimState): void {
  for (const side of SIDES) {
    if (!isHittingPaddle(state, side)) continue;
    bounceOnPaddle(state, side);
    return;
  }
}
