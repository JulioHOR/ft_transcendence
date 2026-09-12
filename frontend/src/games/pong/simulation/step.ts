import {
  resolvePaddleCollisions,
  resolveSideBorders,
} from "./collisions";
import { moveBall } from "./motion";
import { resolveGoals } from "./scoring";
import { isMatchFinished } from "./state";
import type { SimState } from "./types";

export function stepSimulation(state: SimState, deltaSeconds: number): void {
  if (isMatchFinished(state)) return;

  moveBall(state, deltaSeconds);
  resolveSideBorders(state);
  resolvePaddleCollisions(state);
  resolveGoals(state);
}
