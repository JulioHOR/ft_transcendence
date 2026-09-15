import type { Side } from "../../../games/pong/protocol/types";

/**
 * Estado interno da simulação da partida.
 * Usado no mock; o cliente recebe um GameSnapshot via `toSnapshot`.
 * Eixos iguais aos da TABLE: X = comprimento, Z = largura.
 */
export type SimState = {
  /** Posição da bola no eixo X (comprimento). */
  ballX: number;
  /** Posição da bola no eixo Z (largura). */
  ballZ: number;
  /** Velocidade da bola no eixo X (comprimento). */
  velocityX: number;
  /** Velocidade da bola no eixo Z (largura). */
  velocityZ: number;
  /** Posição da paddle esquerda no eixo Z (largura). */
  leftPaddleOffset: number;
  /** Posição da paddle direita no eixo Z (largura). */
  rightPaddleOffset: number;
  /** Velocidade da paddle esquerda no eixo Z (largura), em unidades/s. */
  leftPaddleVelocity: number;
  /** Velocidade da paddle direita no eixo Z (largura), em unidades/s. */
  rightPaddleVelocity: number;
  /** Timestamp do último input da paddle esquerda, em ms. */
  lastLeftPaddleInputAt: number;
  /** Timestamp do último input da paddle direita, em ms. */
  lastRightPaddleInputAt: number;
  scoreLeft: number;
  scoreRight: number;
  winner: Side | null;
};
