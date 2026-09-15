import {
  resolvePaddleCollisions,
  resolveSideBorders,
} from "./collisions";
import { moveBall } from "./motion";
import { decayPaddleVelocities } from "./paddles";
import { resolveGoals } from "./scoring";
import { isMatchFinished } from "./state";
import type { SimState } from "./types";

/**
 * Executa um passo da simulação na ordem:
 * decaimento das paddles, movimento da bola, bordas, paddles e gols.
 *
 * @param state - Estado da simulação
 * @param deltaSeconds - Tempo decorrido desde o último passo, em segundos
 */
export function stepSimulation(state: SimState, deltaSeconds: number): void {
  if (isMatchFinished(state)) return;

  decayPaddleVelocities(state, deltaSeconds);
  moveBall(state, deltaSeconds);
  resolveSideBorders(state);
  resolvePaddleCollisions(state);
  resolveGoals(state);
}
