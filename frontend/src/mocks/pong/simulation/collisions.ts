import type { Side } from "../../../games/pong/protocol/types";
import { clamp } from "../../../games/pong/shared/math";
import {
  ANGLE_FACTOR,
  BASE_PADDLE_SPEED,
  BORDERS,
  PADDLE_MOTION_FACTOR,
  SIDES,
  TABLE,
  type Border,
} from "./constants";
import {
  borderSign,
  getPaddleOffset,
  sideSign,
} from "./geometry";
import { getPaddleVelocity } from "./paddles";
import type { SimState } from "./types";

/**
 * Verifica se a bola e a paddle se sobrepõem no eixo Z (largura).
 *
 * @param paddleOffset - Posição da paddle no eixo Z (largura)
 * @param ballZ - Posição da bola no eixo Z (largura)
 */
function doesPaddleOverlapBall(paddleOffset: number, ballZ: number): boolean {
  const overlapDistance = TABLE.paddleHalfDepth + TABLE.ballRadius;
  return Math.abs(paddleOffset - ballZ) <= overlapDistance;
}

/**
 * Verifica se a velocidade no eixo X (comprimento) aponta para o lado informado.
 */
function isMovingTowardSide(velocityX: number, side: Side): boolean {
  return side === "left" ? velocityX < 0 : velocityX > 0;
}

/**
 * Verifica se a bola está na faixa de colisão da paddle no eixo X (comprimento).
 */
function isBallInPaddleHitZone(ballX: number, side: Side): boolean {
  const paddleFaceX = sideSign(side) * TABLE.paddleX;
  const minX = paddleFaceX - TABLE.ballRadius;
  const maxX = paddleFaceX + TABLE.ballRadius;
  return ballX >= minX && ballX <= maxX;
}

/**
 * Verifica se a bola está colidindo com a paddle do lado informado.
 */
function isHittingPaddle(state: SimState, side: Side): boolean {
  const movingTowardPaddle = isMovingTowardSide(state.velocityX, side);
  const insideHitZone = isBallInPaddleHitZone(state.ballX, side);
  const overlapsPaddle = doesPaddleOverlapBall(
    getPaddleOffset(state, side),
    state.ballZ,
  );
  return movingTowardPaddle && insideHitZone && overlapsPaddle;
}

/**
 * Verifica se a bola ultrapassou a borda superior ou inferior no eixo Z (largura).
 */
function isBallPastBorder(ballZ: number, border: Border): boolean {
  const limit = borderSign(border) * (TABLE.halfWidth - TABLE.ballRadius);
  return border === "top" ? ballZ > limit : ballZ < limit;
}

/**
 * Reflete a bola na borda e corrige a posição no eixo Z (largura).
 */
function bounceOnBorder(state: SimState, border: Border): void {
  state.ballZ = borderSign(border) * (TABLE.halfWidth - TABLE.ballRadius);
  state.velocityZ *= -1;
}

/**
 * Calcula o ponto de contato na paddle no eixo Z (largura), normalizado entre -1 e 1.
 * Valores próximos de ±1 indicam contato perto das extremidades da paddle.
 */
function getPaddleHitRatio(state: SimState, side: Side): number {
  const paddleOffset = getPaddleOffset(state, side);
  const rawRatio = (state.ballZ - paddleOffset) / TABLE.paddleHalfDepth;
  return clamp(rawRatio, -1, 1);
}

/**
 * Posiciona a bola na face da paddle após a colisão, no eixo X (comprimento).
 */
function placeBallOnPaddleFace(state: SimState, side: Side): void {
  const paddleFaceX = sideSign(side) * TABLE.paddleX;
  state.ballX = paddleFaceX - sideSign(side) * TABLE.ballRadius;
}

/**
 * Define a velocidade da bola após o impacto com a paddle.
 * A componente Z depende do ponto de contato e da velocidade da paddle.
 *
 * @param hitRatio - Ponto de contato normalizado no eixo Z (largura) (−1 a 1)
 */
function applyPaddleBounceVelocity(
  state: SimState,
  side: Side,
  hitRatio: number,
): void {
  const directionX = side === "left" ? 1 : -1;
  const paddleMotion = getPaddleVelocity(state, side) * PADDLE_MOTION_FACTOR;

  state.velocityX = directionX * BASE_PADDLE_SPEED;
  state.velocityZ = hitRatio * ANGLE_FACTOR + paddleMotion;
}

/** Aplica o rebote completo da bola na paddle. */
function bounceOnPaddle(state: SimState, side: Side): void {
  const hitRatio = getPaddleHitRatio(state, side);
  placeBallOnPaddleFace(state, side);
  applyPaddleBounceVelocity(state, side, hitRatio);
}

/** Trata colisões da bola com as bordas superior e inferior. */
export function resolveSideBorders(state: SimState): void {
  for (const border of BORDERS) {
    if (!isBallPastBorder(state.ballZ, border)) continue;
    bounceOnBorder(state, border);
    return;
  }
}

/** Trata colisões da bola com as paddles. */
export function resolvePaddleCollisions(state: SimState): void {
  for (const side of SIDES) {
    if (!isHittingPaddle(state, side)) continue;
    bounceOnPaddle(state, side);
    return;
  }
}
