import type { Side } from "../../../games/pong/protocol/types";
import type { Border } from "./constants";
import { TABLE } from "./constants";
import type { SimState } from "./types";

/**
 * Retorna o sinal do lado no eixo X (comprimento).
 *
 * @returns `-1` para esquerda, `1` para direita
 */
export function sideSign(side: Side): number {
  return side === "left" ? -1 : 1;
}

/**
 * Retorna o sinal da borda no eixo Z (largura).
 *
 * @returns `1` para top (+Z), `-1` para bottom (−Z)
 */
export function borderSign(border: Border): number {
  return border === "top" ? 1 : -1;
}

/**
 * Retorna a posição da paddle no eixo Z (largura).
 *
 * @param state - Estado da simulação
 * @param side - Lado da paddle
 */
export function getPaddleOffset(state: SimState, side: Side): number {
  return side === "left" ? state.leftPaddleOffset : state.rightPaddleOffset;
}

/**
 * Retorna a coordenada X (comprimento) da face da paddle.
 *
 * @param side - Lado da mesa
 */
export function getPaddleX(side: Side): number {
  return sideSign(side) * TABLE.paddleX;
}
