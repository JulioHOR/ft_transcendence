import type { Side } from "../transport/types";

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
