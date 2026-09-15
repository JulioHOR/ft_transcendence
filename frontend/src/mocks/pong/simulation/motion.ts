import type { SimState } from "./types";

/**
 * Atualiza a posição da bola com base na velocidade e no intervalo de tempo.
 *
 * @param state - Estado da simulação
 * @param deltaSeconds - Tempo decorrido desde o último passo, em segundos
 */
export function moveBall(state: SimState, deltaSeconds: number): void {
  state.ballX += state.velocityX * deltaSeconds;
  state.ballZ += state.velocityZ * deltaSeconds;
}
