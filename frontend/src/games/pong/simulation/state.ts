import type { GameSnapshot } from "../transport/types";
import {
  INITIAL_VELOCITY_X,
  INITIAL_VELOCITY_Z,
} from "./constants";
import type { SimState } from "./types";

function randomVelocityZSign(): number {
  return Math.random() > 0.5 ? 1 : -1;
}

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

export function resetBall(state: SimState, towardRight: boolean): void {
  state.ballX = 0;
  state.ballZ = 0;
  state.velocityX = towardRight ? INITIAL_VELOCITY_X : -INITIAL_VELOCITY_X;
  state.velocityZ = INITIAL_VELOCITY_Z * randomVelocityZSign();
}

export function stopBall(state: SimState): void {
  state.ballX = 0;
  state.ballZ = 0;
  state.velocityX = 0;
  state.velocityZ = 0;
}

export function isMatchFinished(state: SimState): boolean {
  return state.winner !== null;
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
