import type { Side } from "../transport/types";
import { POINTS_TO_WIN, TABLE } from "./constants";
import { sideSign } from "./geometry";
import { resetBall, stopBall } from "./state";
import type { SimState } from "./types";

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

function scoreOnLeftGoal(state: SimState): void {
  state.scoreRight += 1;
  if (hasReachedPointLimit(state.scoreRight)) {
    declareWinner(state, "right");
    return;
  }
  resetBall(state, true);
}

function scoreOnRightGoal(state: SimState): void {
  state.scoreLeft += 1;
  if (hasReachedPointLimit(state.scoreLeft)) {
    declareWinner(state, "left");
    return;
  }
  resetBall(state, false);
}

export function resolveGoals(state: SimState): void {
  if (isGoalOnSide(state.ballX, "left")) {
    scoreOnLeftGoal(state);
    return;
  }
  if (isGoalOnSide(state.ballX, "right")) {
    scoreOnRightGoal(state);
  }
}
