import type { Side } from "../transport/types";
import { clamp } from "../math";
import {
  ANGLE_FACTOR,
  BORDERS,
  MAX_BALL_SPEED,
  SIDES,
  SPEED_GAIN_ON_HIT,
  TABLE,
  type Border,
} from "./constants";
import {
  borderSign,
  getPaddleOffset,
  sideSign,
} from "./geometry";
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

function getBallSpeed(state: SimState): number {
  return Math.hypot(state.velocityX, state.velocityZ);
}

function applyPaddleAngle(state: SimState, hitRatio: number): void {
  state.velocityZ = hitRatio * ANGLE_FACTOR;
}

function accelerateAfterPaddleHit(state: SimState): void {
  const currentSpeed = getBallSpeed(state);
  if (currentSpeed === 0) return;
  const boostedSpeed = Math.min(
    currentSpeed * SPEED_GAIN_ON_HIT,
    MAX_BALL_SPEED,
  );
  const scale = boostedSpeed / currentSpeed;
  state.velocityX *= scale;
  state.velocityZ *= scale;
}

function placeBallOnPaddleFace(state: SimState, side: Side): void {
  const paddleFaceX = sideSign(side) * TABLE.paddleX;
  state.ballX = paddleFaceX - sideSign(side) * TABLE.ballRadius;
}

function bounceOnPaddle(state: SimState, side: Side): void {
  const hitRatio = getPaddleHitRatio(state, side);
  placeBallOnPaddleFace(state, side);
  state.velocityX *= -1;
  applyPaddleAngle(state, hitRatio);
  accelerateAfterPaddleHit(state);
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
