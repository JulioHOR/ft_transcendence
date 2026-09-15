import type { Side } from "../../../games/pong/protocol/types";
import { PADDLE_VELOCITY_DECAY } from "./constants";
import { getPaddleOffset } from "./geometry";
import type { SimState } from "./types";

/** Define a velocidade da paddle no eixo Z (largura). */
function setPaddleVelocity(state: SimState, side: Side, velocity: number): void {
  if (side === "left") {
    state.leftPaddleVelocity = velocity;
    return;
  }
  state.rightPaddleVelocity = velocity;
}

/** Registra o timestamp do último input da paddle. */
function setLastPaddleInputAt(
  state: SimState,
  side: Side,
  timestampMs: number,
): void {
  if (side === "left") {
    state.lastLeftPaddleInputAt = timestampMs;
    return;
  }
  state.lastRightPaddleInputAt = timestampMs;
}

/** Retorna o timestamp do último input da paddle. */
function getLastPaddleInputAt(state: SimState, side: Side): number {
  return side === "left"
    ? state.lastLeftPaddleInputAt
    : state.lastRightPaddleInputAt;
}

/**
 * Retorna a velocidade da paddle no eixo Z (largura).
 *
 * @param state - Estado da simulação
 * @param side - Lado da paddle
 */
export function getPaddleVelocity(state: SimState, side: Side): number {
  return side === "left" ? state.leftPaddleVelocity : state.rightPaddleVelocity;
}

/**
 * Atualiza a posição da paddle no eixo Z (largura) e recalcula sua velocidade.
 *
 * @param state - Estado da simulação
 * @param side - Lado da paddle
 * @param offset - Nova posição no eixo Z (largura)
 * @param deltaSeconds - Intervalo desde a posição anterior, em segundos
 */
export function setPaddleOffset(
  state: SimState,
  side: Side,
  offset: number,
  deltaSeconds: number,
): void {
  const previousOffset = getPaddleOffset(state, side);
  const velocity =
    deltaSeconds > 0 ? (offset - previousOffset) / deltaSeconds : 0;

  if (side === "left") {
    state.leftPaddleOffset = offset;
  } else {
    state.rightPaddleOffset = offset;
  }
  setPaddleVelocity(state, side, velocity);
}

/**
 * Aplica um input de paddle no estado da simulação.
 *
 * @param state - Estado da simulação
 * @param side - Lado da paddle
 * @param offset - Posição no eixo Z (largura)
 * @param timestampMs - Momento do input, em milissegundos
 */
export function applyPaddleInput(
  state: SimState,
  side: Side,
  offset: number,
  timestampMs: number,
): void {
  const lastInputAt = getLastPaddleInputAt(state, side);
  const deltaSeconds =
    lastInputAt === 0 ? 0 : (timestampMs - lastInputAt) / 1000;

  setPaddleOffset(state, side, offset, deltaSeconds);
  setLastPaddleInputAt(state, side, timestampMs);
}

/**
 * Reduz gradualmente a velocidade das paddles no eixo Z (largura).
 *
 * @param state - Estado da simulação
 * @param deltaSeconds - Tempo decorrido desde o último passo, em segundos
 */
export function decayPaddleVelocities(
  state: SimState,
  deltaSeconds: number,
): void {
  const decay = Math.exp(-PADDLE_VELOCITY_DECAY * deltaSeconds);
  state.leftPaddleVelocity *= decay;
  state.rightPaddleVelocity *= decay;
}
