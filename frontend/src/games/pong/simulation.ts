import type { GameSnapshot, Side } from "./transport/types";

export type { Side };

export const TABLE = {
  halfLength: 10,
  halfWidth: 5,
  paddleX: 9,
  paddleHalfDepth: 1,
  ballRadius: 0.35,
} as const;

export const POINTS_TO_WIN = 5;

type Border = "top" | "bottom";

const INITIAL_VELOCITY_X = 6;
const INITIAL_VELOCITY_Z = 3;
const SIDES: Side[] = ["left", "right"];
const BORDERS: Border[] = ["top", "bottom"];

export type SimState = {
  ballX: number;
  ballZ: number;
  velocityX: number;
  velocityZ: number;
  leftPaddleOffset: number;
  rightPaddleOffset: number;
  scoreLeft: number;
  scoreRight: number;
  winner: Side | null;
};

export function createInitialSimState(): SimState {
  return {
    ballX: 0,
    ballZ: 0,
    velocityX: INITIAL_VELOCITY_X,
    velocityZ: INITIAL_VELOCITY_Z,
    leftPaddleOffset: 0,
    rightPaddleOffset: 0,
    scoreLeft: 0,
    scoreRight: 0,
    winner: null,
  };
}

function sideSign(side: Side): number {
  return side === "left" ? -1 : 1;
}

function borderSign(border: Border): number {
  return border === "top" ? 1 : -1;
}

function randomVelocityZSign(): number {
  return Math.random() > 0.5 ? 1 : -1;
}

function resetBall(state: SimState, towardRight: boolean): void {
  state.ballX = 0;
  state.ballZ = 0;
  state.velocityX = towardRight ? INITIAL_VELOCITY_X : -INITIAL_VELOCITY_X;
  state.velocityZ = INITIAL_VELOCITY_Z * randomVelocityZSign();
}

function stopBall(state: SimState): void {
  state.ballX = 0;
  state.ballZ = 0;
  state.velocityX = 0;
  state.velocityZ = 0;
}

function getPaddleOffset(state: SimState, side: Side): number {
  return side === "left" ? state.leftPaddleOffset : state.rightPaddleOffset;
}

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

function isGoalOnSide(ballX: number, side: Side): boolean {
  const limit = sideSign(side) * TABLE.halfLength;
  return side === "left" ? ballX < limit : ballX > limit;
}

function hasReachedPointLimit(score: number): boolean {
  return score >= POINTS_TO_WIN;
}

function declareWinner(state: SimState, winner: Side): void {
  state.winner = winner;
  stopBall(state);
}

function moveBall(state: SimState, deltaSeconds: number): void {
  state.ballX += state.velocityX * deltaSeconds;
  state.ballZ += state.velocityZ * deltaSeconds;
}

function bounceOnBorder(state: SimState, border: Border): void {
  state.ballZ = borderSign(border) * (TABLE.halfWidth - TABLE.ballRadius);
  state.velocityZ *= -1;
}

function bounceOnPaddle(state: SimState, side: Side): void {
  const paddleFaceX = sideSign(side) * TABLE.paddleX;
  state.ballX = paddleFaceX - sideSign(side) * TABLE.ballRadius;
  state.velocityX *= -1;
}

function resolveSideBorders(state: SimState): void {
  for (const border of BORDERS) {
    if (!isBallPastBorder(state.ballZ, border)) continue;
    bounceOnBorder(state, border);
    return;
  }
}

function resolvePaddleCollisions(state: SimState): void {
  for (const side of SIDES) {
    if (!isHittingPaddle(state, side)) continue;
    bounceOnPaddle(state, side);
    return;
  }
}

function resolveGoals(state: SimState): void {
  if (isGoalOnSide(state.ballX, "left")) {
    state.scoreRight += 1;
    if (hasReachedPointLimit(state.scoreRight)) {
      declareWinner(state, "right");
      return;
    }
    resetBall(state, true);
    return;
  }

  if (isGoalOnSide(state.ballX, "right")) {
    state.scoreLeft += 1;
    if (hasReachedPointLimit(state.scoreLeft)) {
      declareWinner(state, "left");
      return;
    }
    resetBall(state, false);
  }
}

export function isMatchFinished(state: SimState): boolean {
  return state.winner !== null;
}

export function stepSimulation(state: SimState, deltaSeconds: number): void {
  if (isMatchFinished(state)) return;

  moveBall(state, deltaSeconds);
  resolveSideBorders(state);
  resolvePaddleCollisions(state);
  resolveGoals(state);
}

export function toSnapshot(state: SimState, timestamp: number): GameSnapshot {
  return {
    leftPaddleOffset: state.leftPaddleOffset,
    rightPaddleOffset: state.rightPaddleOffset,
    ball: { x: state.ballX, z: state.ballZ },
    score: { left: state.scoreLeft, right: state.scoreRight },
    winner: state.winner,
    timestamp,
  };
}

export function getPaddleX(side: Side): number {
  return sideSign(side) * TABLE.paddleX;
}
