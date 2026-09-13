import type { GameSnapshot } from "../../../games/pong/protocol/types";
import {
  INITIAL_VELOCITY_X,
  INITIAL_VELOCITY_Z,
} from "./constants";
import type { SimState } from "./types";

/** Sorteia o sinal da velocidade inicial no eixo Z (largura) (+1 ou -1). */
function randomVelocityZSign(): number {
  return Math.random() > 0.5 ? 1 : -1;
}

/** Cria o estado inicial de uma partida. */
export function createInitialSimState(): SimState {
  return {
    ballX: 0,
    ballZ: 0,
    velocityX: INITIAL_VELOCITY_X,
    velocityZ: INITIAL_VELOCITY_Z,
    leftPaddleOffset: 0,
    rightPaddleOffset: 0,
    leftPaddleVelocity: 0,
    rightPaddleVelocity: 0,
    lastLeftPaddleInputAt: 0,
    lastRightPaddleInputAt: 0,
    scoreLeft: 0,
    scoreRight: 0,
    winner: null,
  };
}

/**
 * Reposiciona a bola no centro e define a direção do saque.
 *
 * @param state - Estado da simulação
 * @param towardRight - Se `true`, a bola sai no sentido +X; caso contrário, −X
 */
export function resetBall(state: SimState, towardRight: boolean): void {
  state.ballX = 0;
  state.ballZ = 0;
  state.velocityX = towardRight ? INITIAL_VELOCITY_X : -INITIAL_VELOCITY_X;
  state.velocityZ = INITIAL_VELOCITY_Z * randomVelocityZSign();
}

/** Para a bola e a posiciona no centro da mesa. */
export function stopBall(state: SimState): void {
  state.ballX = 0;
  state.ballZ = 0;
  state.velocityX = 0;
  state.velocityZ = 0;
}

/** Indica se a partida já possui um vencedor. */
export function isMatchFinished(state: SimState): boolean {
  return state.winner !== null;
}

/**
 * Converte o estado interno da simulação para o GameSnapshot do protocolo.
 *
 * @param state - Estado da simulação
 * @param timestamp - Timestamp do frame, em milissegundos
 */
export function toSnapshot(state: SimState, timestamp: number): GameSnapshot {
  return {
    leftPaddleOffset: state.leftPaddleOffset,
    rightPaddleOffset: state.rightPaddleOffset,
    ball: { x: state.ballX, z: state.ballZ },
    score: { left: state.scoreLeft, right: state.scoreRight },
    winner: state.winner,
    timestamp,
  };
}
