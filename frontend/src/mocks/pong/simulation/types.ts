import type { Side } from "../../../games/pong/protocol/types";

export type SimState = {
  ballX: number;
  ballZ: number;
  velocityX: number;
  velocityZ: number;
  leftPaddleOffset: number;
  rightPaddleOffset: number;
  leftPaddleVelocity: number;
  rightPaddleVelocity: number;
  lastLeftPaddleInputAt: number;
  lastRightPaddleInputAt: number;
  scoreLeft: number;
  scoreRight: number;
  winner: Side | null;
};
