import {
  resolvePaddleCollisions,
  resolveSideBorders,
} from "./collisions";
import { moveBall } from "./motion";
import { decayPaddleVelocities } from "./paddles";
import { resolveGoals } from "./scoring";
import { isMatchFinished } from "./state";
import type { SimState } from "./types";

export function stepSimulation(state: SimState, deltaSeconds: number): void {
  if (isMatchFinished(state)) return;

  decayPaddleVelocities(state, deltaSeconds);
  moveBall(state, deltaSeconds);
  resolveSideBorders(state);
  resolvePaddleCollisions(state);
  resolveGoals(state);
}
