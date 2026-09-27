import type { Side } from "./types";

/**
 * Dimensões da mesa em unidades do mundo 3D (Three.js, Y para cima).
 *
 * Orientação usada em todo o módulo:
 * - X: comprimento da mesa (gol ↔ gol)
 * - Z: largura da mesa (movimento das paddles)
 * - Y: altura (quase fixa na física; só no desenho 3D)
 */
export const TABLE = {
  /** Metade do comprimento da mesa. */
  halfLength: 10,
  /** Metade da largura da mesa. */
  halfWidth: 5,
  /** Posição da face da paddle no eixo X (comprimento). */
  paddleX: 9,
  /** Metade da altura da paddle. */
  paddleHalfDepth: 1,
  /** Raio da bola. */
  ballRadius: 0.35,
} as const;

/** Quantidade de pontos necessária para vencer a partida. */
export const POINTS_TO_WIN = 3;

/**
 * Retorna a coordenada X (comprimento) da face da paddle.
 *
 * @param side - Lado da mesa
 */
export function getPaddleX(side: Side): number {
  return (side === "left" ? -1 : 1) * TABLE.paddleX;
}
