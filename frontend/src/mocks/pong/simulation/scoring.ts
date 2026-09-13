import type { Side } from "../../../games/pong/protocol/types";
import { POINTS_TO_WIN, TABLE } from "./constants";
import { sideSign } from "./geometry";
import { resetBall, stopBall } from "./state";
import type { SimState } from "./types";

/**
 * Verifica se a bola ultrapassou a linha de gol no eixo X (comprimento).
 *
 * @param ballX - Posição da bola no eixo X (comprimento)
 * @param side - Extremidade da mesa a verificar
 */
function isGoalOnSide(ballX: number, side: Side): boolean {
  const limit = sideSign(side) * TABLE.halfLength;
  return side === "left" ? ballX < limit : ballX > limit;
}

/** Indica se a pontuação atingiu o limite para vitória. */
function hasReachedPointLimit(score: number): boolean {
  return score >= POINTS_TO_WIN;
}

/** Define o vencedor e para a bola. */
function declareWinner(state: SimState, winner: Side): void {
  state.winner = winner;
  stopBall(state);
}

/**
 * Trata gol na extremidade esquerda: ponto para a direita
 * e novo saque, ou fim de partida.
 */
function scoreOnLeftGoal(state: SimState): void {
  state.scoreRight += 1;
  if (hasReachedPointLimit(state.scoreRight)) {
    declareWinner(state, "right");
    return;
  }
  resetBall(state, true);
}

/**
 * Trata gol na extremidade direita: ponto para a esquerda
 * e novo saque, ou fim de partida.
 */
function scoreOnRightGoal(state: SimState): void {
  state.scoreLeft += 1;
  if (hasReachedPointLimit(state.scoreLeft)) {
    declareWinner(state, "left");
    return;
  }
  resetBall(state, false);
}

/**
 * Verifica se houve gol, atualiza o placar e reinicia o saque
 * ou encerra a partida.
 */
export function resolveGoals(state: SimState): void {
  if (isGoalOnSide(state.ballX, "left")) {
    scoreOnLeftGoal(state);
    return;
  }
  if (isGoalOnSide(state.ballX, "right")) {
    scoreOnRightGoal(state);
  }
}
