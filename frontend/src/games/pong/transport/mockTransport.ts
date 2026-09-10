import type { Transport, PaddleInput, GameSnapshot } from "./types";
import {
  createInitialSimState,
  stepSimulation,
  toSnapshot,
  TABLE,
  isMatchFinished,
  type SimState,
} from "../simulation";
import { clamp, computeDeltaSeconds } from "../math";

const OPPONENT_MAX_SPEED = 8;
const OPPONENT_CHASE_FACTOR = 4;
const MAX_FRAME_DELTA_SECONDS = 0.05;

type SessionRefs = {
  frameId: number | null;
  listener: ((snapshot: GameSnapshot) => void) | null;
  matchState: SimState;
  lastFrameTime: number;
};

function getOpponentOffsetLimits(): { min: number; max: number } {
  return { min: -TABLE.halfWidth + 1, max: TABLE.halfWidth - 1 };
}

function updateOpponentPaddle(state: SimState, deltaSeconds: number): void {
  const distanceToBall = state.ballZ - state.rightPaddleOffset;
  const chaseStep = distanceToBall * OPPONENT_CHASE_FACTOR;
  const limitedStep = clamp(chaseStep, -OPPONENT_MAX_SPEED, OPPONENT_MAX_SPEED);
  const nextOffset = state.rightPaddleOffset + limitedStep * deltaSeconds;
  const { min, max } = getOpponentOffsetLimits();
  state.rightPaddleOffset = clamp(nextOffset, min, max);
}

function advancePlayingMatch(state: SimState, deltaSeconds: number): void {
  const safeDelta = Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS);
  updateOpponentPaddle(state, safeDelta);
  stepSimulation(state, safeDelta);
}

function createSessionRefs(): SessionRefs {
  return {
    frameId: null,
    listener: null,
    matchState: createInitialSimState(),
    lastFrameTime: 0,
  };
}

function stopLoop(refs: SessionRefs): void {
  if (refs.frameId === null) return;
  cancelAnimationFrame(refs.frameId);
  refs.frameId = null;
}

function publishSnapshot(refs: SessionRefs, timestamp: number): void {
  refs.listener?.(toSnapshot(refs.matchState, timestamp));
}

function resetMatch(refs: SessionRefs): void {
  refs.matchState = createInitialSimState();
  refs.lastFrameTime = 0;
  publishSnapshot(refs, performance.now());
}

function tick(refs: SessionRefs, now: number): void {
  const deltaSeconds = computeDeltaSeconds(now, refs.lastFrameTime);
  refs.lastFrameTime = now;
  if (!isMatchFinished(refs.matchState)) {
    advancePlayingMatch(refs.matchState, deltaSeconds);
  }
  publishSnapshot(refs, now);
  refs.frameId = requestAnimationFrame((next) => tick(refs, next));
}

function connectSession(refs: SessionRefs): void {
  stopLoop(refs);
  resetMatch(refs);
  refs.frameId = requestAnimationFrame((now) => tick(refs, now));
}

function disconnectSession(refs: SessionRefs): void {
  stopLoop(refs);
  refs.listener = null;
  refs.lastFrameTime = 0;
}

function sendSessionInput(refs: SessionRefs, input: PaddleInput): void {
  if (isMatchFinished(refs.matchState)) return;
  refs.matchState.leftPaddleOffset = input.offset;
}

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

export function createMockTransport(): Transport {
  return buildTransport(createSessionRefs());
}
