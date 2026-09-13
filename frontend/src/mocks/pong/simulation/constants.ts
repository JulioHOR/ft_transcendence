import type { Side } from "../../../games/pong/protocol/types";
import { TABLE } from "../../../games/pong/protocol/table";

export { TABLE };
export { POINTS_TO_WIN } from "../../../games/pong/protocol/table";

/** Velocidade inicial da bola no eixo X (comprimento). */
export const INITIAL_VELOCITY_X = 6;
/** Velocidade inicial da bola no eixo Z (largura). */
export const INITIAL_VELOCITY_Z = 2;

/** Módulo da velocidade no eixo X (comprimento) após bater na paddle. */
export const BASE_PADDLE_SPEED = 6;
/**
 * Multiplicador do ponto de contato na paddle para definir a
 * componente de velocidade no eixo Z (largura) após o impacto.
 */
export const ANGLE_FACTOR = 4.5;
/**
 * Quanto da velocidade da paddle no eixo Z (largura) é transferida
 * para a bola no momento do impacto.
 */
export const PADDLE_MOTION_FACTOR = 0.55;
/** Taxa de redução da velocidade das paddles quando param de se mover. */
export const PADDLE_VELOCITY_DECAY = 8;

/** Lados da mesa usados na simulação. */
export const SIDES: Side[] = ["left", "right"];

/** Bordas laterais da mesa no eixo Z (largura): top = +Z, bottom = −Z. */
export type Border = "top" | "bottom";
/** Lista das bordas laterais usadas na resolução de colisão. */
export const BORDERS: Border[] = ["top", "bottom"];
