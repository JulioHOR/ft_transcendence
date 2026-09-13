import type { Transport, PaddleInput, GameSnapshot } from "../../games/pong/protocol/types";
import {
  createInitialSimState,
  stepSimulation,
  toSnapshot,
  TABLE,
  isMatchFinished,
  applyPaddleInput,
  setPaddleOffset,
  type SimState,
} from "./simulation";
import { clamp, computeDeltaSeconds } from "../../games/pong/shared/math";

/** Velocidade máxima do oponente no eixo Z (largura). */
const OPPONENT_MAX_SPEED = 8;
/** Intensidade com que o oponente persegue a bola no eixo Z (largura). */
const OPPONENT_CHASE_FACTOR = 4;
/** Intervalo máximo considerado por frame, em segundos. */
const MAX_FRAME_DELTA_SECONDS = 0.05;

/** Referências mutáveis da sessão mock. */
type SessionRefs = {
  frameId: number | null;
  listener: ((snapshot: GameSnapshot) => void) | null;
  matchState: SimState;
  lastFrameTime: number;
};

/** Limites de movimento do oponente no eixo Z (largura). */
function getOpponentOffsetLimits(): { min: number; max: number } {
  return { min: -TABLE.halfWidth + 1, max: TABLE.halfWidth - 1 };
}

/**
 * Move a paddle direita em direção à posição da bola no eixo Z (largura).
 *
 * @param state - Estado da simulação
 * @param deltaSeconds - Tempo decorrido desde o último passo, em segundos
 */
function updateOpponentPaddle(state: SimState, deltaSeconds: number): void {
  const distanceToBall = state.ballZ - state.rightPaddleOffset;
  const chaseStep = distanceToBall * OPPONENT_CHASE_FACTOR;
  const limitedStep = clamp(chaseStep, -OPPONENT_MAX_SPEED, OPPONENT_MAX_SPEED);
  const limits = getOpponentOffsetLimits();
  const nextOffset = clamp(
    state.rightPaddleOffset + limitedStep * deltaSeconds,
    limits.min,
    limits.max,
  );
  setPaddleOffset(state, "right", nextOffset, deltaSeconds);
}

/**
 * Atualiza o oponente e executa um passo da simulação.
 *
 * @param state - Estado da simulação
 * @param deltaSeconds - Tempo decorrido desde o último frame, em segundos
 */
function advancePlayingMatch(state: SimState, deltaSeconds: number): void {
  const safeDelta = Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS);
  updateOpponentPaddle(state, safeDelta);
  stepSimulation(state, safeDelta);
}

/** Cria as referências iniciais de uma sessão. */
function createSessionRefs(): SessionRefs {
  return {
    frameId: null,
    listener: null,
    matchState: createInitialSimState(),
    lastFrameTime: 0,
  };
}

/** Interrompe o loop de animação da sessão. */
function stopLoop(refs: SessionRefs): void {
  if (refs.frameId === null) return;
  cancelAnimationFrame(refs.frameId);
  refs.frameId = null;
}

/**
 * Envia o estado atual da partida para o listener registrado.
 *
 * @param refs - Referências da sessão
 * @param timestamp - Timestamp do frame, em milissegundos
 */
function publishSnapshot(refs: SessionRefs, timestamp: number): void {
  refs.listener?.(toSnapshot(refs.matchState, timestamp));
}

/** Reinicia o estado da partida e publica um snapshot. */
function resetMatch(refs: SessionRefs): void {
  refs.matchState = createInitialSimState();
  refs.lastFrameTime = 0;
  publishSnapshot(refs, performance.now());
}

/**
 * Callback por frame: avança a partida (se ativa) e publica o estado.
 *
 * @param refs - Referências da sessão
 * @param now - Timestamp do frame, em milissegundos
 */
function tick(refs: SessionRefs, now: number): void {
  const deltaSeconds = computeDeltaSeconds(now, refs.lastFrameTime);
  refs.lastFrameTime = now;
  if (!isMatchFinished(refs.matchState)) {
    advancePlayingMatch(refs.matchState, deltaSeconds);
  }
  publishSnapshot(refs, now);
  refs.frameId = requestAnimationFrame((next) => tick(refs, next));
}

/** Inicia a sessão: reinicia a partida e começa o loop de frames. */
function connectSession(refs: SessionRefs): void {
  stopLoop(refs);
  resetMatch(refs);
  refs.frameId = requestAnimationFrame((now) => tick(refs, now));
}

/** Encerra a sessão e limpa o listener. */
function disconnectSession(refs: SessionRefs): void {
  stopLoop(refs);
  refs.listener = null;
  refs.lastFrameTime = 0;
}

/**
 * Aplica o input do cliente na paddle esquerda (jogador).
 *
 * @param refs - Referências da sessão
 * @param input - Input recebido do cliente
 */
function sendSessionInput(refs: SessionRefs, input: PaddleInput): void {
  if (isMatchFinished(refs.matchState)) return;
  applyPaddleInput(
    refs.matchState,
    "left",
    input.offset,
    performance.now(),
  );
}

/** Monta a implementação de Transport sobre as referências da sessão. */
function buildTransport(refs: SessionRefs): Transport {
  return {
    async connect() {
      connectSession(refs);
    },
    disconnect() {
      disconnectSession(refs);
    },
    restart() {
      resetMatch(refs);
    },
    sendInput(input) {
      sendSessionInput(refs, input);
    },
    onSnapshot(listener) {
      refs.listener = listener;
    },
  };
}

/**
 * Cria um Transport local com simulação e oponente controlado por código.
 * Mock de desenvolvimento até a integração com o backend.
 */
export function createMockTransport(): Transport {
  return buildTransport(createSessionRefs());
}
