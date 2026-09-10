import { useEffect, useRef, type MutableRefObject } from "react";
import type { Transport } from "./transport/types";
import { TABLE } from "./simulation";
import { clamp, computeDeltaSeconds } from "./math";

const PADDLE_SPEED = 8;
const MOVE_UP_CODES = new Set(["KeyW", "ArrowUp"]);
const MOVE_DOWN_CODES = new Set(["KeyS", "ArrowDown"]);

type MoveDirection = "moveUp" | "moveDown";
type PressedKeys = Record<MoveDirection, boolean>;
type UsePaddleInputOptions = { enabled: boolean };

function getMoveDirection(code: string): MoveDirection | null {
  if (MOVE_UP_CODES.has(code)) return "moveUp";
  if (MOVE_DOWN_CODES.has(code)) return "moveDown";
  return null;
}

function clampPaddleOffset(offset: number): number {
  return clamp(offset, -TABLE.halfWidth, TABLE.halfWidth);
}

function movementDelta(direction: MoveDirection, deltaSeconds: number): number {
  const distance = PADDLE_SPEED * deltaSeconds;
  return direction === "moveUp" ? -distance : distance;
}

function computeNextPaddleOffset(
  currentOffset: number,
  pressed: PressedKeys,
  deltaSeconds: number,
): number {
  let nextOffset = currentOffset;
  if (pressed.moveUp) nextOffset += movementDelta("moveUp", deltaSeconds);
  if (pressed.moveDown) nextOffset += movementDelta("moveDown", deltaSeconds);
  return clampPaddleOffset(nextOffset);
}

function hasMovementInput(pressed: PressedKeys): boolean {
  return pressed.moveUp || pressed.moveDown;
}

type InputLoopRefs = {
  paddleOffset: MutableRefObject<number>;
  inputSequence: MutableRefObject<number>;
  pressed: MutableRefObject<PressedKeys>;
};

function sendPaddleInput(
  transport: Transport,
  refs: InputLoopRefs,
  pressed: PressedKeys,
  deltaSeconds: number,
): void {
  const nextOffset = computeNextPaddleOffset(
    refs.paddleOffset.current,
    pressed,
    deltaSeconds,
  );
  refs.paddleOffset.current = nextOffset;
  refs.inputSequence.current += 1;
  transport.sendInput({
    offset: nextOffset,
    sequence: refs.inputSequence.current,
  });
}

function runInputFrame(
  transport: Transport,
  refs: InputLoopRefs,
  enabled: boolean,
  now: number,
  lastFrameTime: MutableRefObject<number>,
): void {
  const deltaSeconds = computeDeltaSeconds(now, lastFrameTime.current);
  lastFrameTime.current = now;
  const pressed = refs.pressed.current;
  if (enabled && hasMovementInput(pressed)) {
    sendPaddleInput(transport, refs, pressed, deltaSeconds);
  }
}

function attachKeyboard(pressed: MutableRefObject<PressedKeys>) {
  function setDirectionPressed(code: string, isPressed: boolean): void {
    const direction = getMoveDirection(code);
    if (!direction) return;
    pressed.current[direction] = isPressed;
  }

  function onKeyDown(event: KeyboardEvent): void {
    setDirectionPressed(event.code, true);
  }

  function onKeyUp(event: KeyboardEvent): void {
    setDirectionPressed(event.code, false);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

function startInputLoop(
  transport: Transport,
  refs: InputLoopRefs,
  enabled: boolean,
): () => void {
  let frameId = 0;
  const lastFrameTime = { current: 0 };

  function tick(now: number): void {
    runInputFrame(transport, refs, enabled, now, lastFrameTime);
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

export function usePaddleInput(
  transport: Transport,
  { enabled }: UsePaddleInputOptions,
) {
  const paddleOffset = useRef(0);
  const inputSequence = useRef(0);
  const pressed = useRef<PressedKeys>({ moveUp: false, moveDown: false });

  useEffect(() => {
    if (!enabled) pressed.current = { moveUp: false, moveDown: false };
  }, [enabled]);

  useEffect(() => {
    const refs = { paddleOffset, inputSequence, pressed };
    const detachKeyboard = attachKeyboard(pressed);
    const stopLoop = startInputLoop(transport, refs, enabled);
    return () => {
      stopLoop();
      detachKeyboard();
    };
  }, [transport, enabled]);
}
