import { useEffect, useRef, type MutableRefObject } from "react";
import type { Transport } from "../protocol";
import { inputLimit } from "../protocol";
import { clamp, computeDeltaSeconds } from "../shared/math";
import {
  MOVE_DOWN_CODES,
  MOVE_UP_CODES,
  PADDLE_SPEED,
} from "../constants";
import type { UsePaddleInputOptions } from "./props";

/** Directions accepted by the paddle controls. */
type MoveDirection = "moveUp" | "moveDown";

/** State of the movement keys. */
type PressedKeys = Record<MoveDirection, boolean>;
/**
 * Converts a key code into a movement direction,
 * or `null` if the key does not control the paddle.
 */
function getMoveDirection(code: string): MoveDirection | null {
  if (MOVE_UP_CODES.has(code)) return "moveUp";
  if (MOVE_DOWN_CODES.has(code)) return "moveDown";
  return null;
}

/**
 * Clamps the paddle position on the Z axis (width) to the table edges.
 *
 * @param position - Candidate position on the Z axis (width)
 */
function clampPaddlePosition(position: number): number {
  return clamp(position, -inputLimit, inputLimit);
}

/**
 * Calculates the displacement on the Z axis (width) for a direction and time interval.
 *
 * @param direction - Movement direction
 * @param deltaSeconds - Elapsed time in seconds
 */
function movementDelta(direction: MoveDirection, deltaSeconds: number): number {
  const distance = PADDLE_SPEED * deltaSeconds;
  return direction === "moveUp" ? -distance : distance;
}

/**
 * Calculates the next paddle position on the Z axis (width) from the pressed keys.
 *
 * @param currentPosition - Current position on the Z axis (width)
 * @param pressed - State of the movement keys
 * @param deltaSeconds - Elapsed time in seconds
 */
function computeNextPaddlePosition(
  currentPosition: number,
  pressed: PressedKeys,
  deltaSeconds: number,
): number {
  let nextPosition = currentPosition;
  if (pressed.moveUp) nextPosition += movementDelta("moveUp", deltaSeconds);
  if (pressed.moveDown) nextPosition += movementDelta("moveDown", deltaSeconds);
  return clampPaddlePosition(nextPosition);
}

/** Indicates whether any movement key is pressed. */
function hasMovementInput(pressed: PressedKeys): boolean {
  return pressed.moveUp || pressed.moveDown;
}

/** Mutable references used in the input loop. */
type InputLoopRefs = {
  paddlePosition: MutableRefObject<number>;
  pressed: MutableRefObject<PressedKeys>;
};

/**
 * Updates the local paddle position and sends the input through the transport.
 *
 * @param transport - Match communication channel
 * @param refs - Input loop references
 * @param pressed - Key state
 * @param deltaSeconds - Elapsed time in seconds
 */
function sendPaddleInput(
  transport: Transport,
  refs: InputLoopRefs,
  pressed: PressedKeys,
  deltaSeconds: number,
): void {
  const nextPosition = computeNextPaddlePosition(
    refs.paddlePosition.current,
    pressed,
    deltaSeconds,
  );
  refs.paddlePosition.current = nextPosition;
  transport.sendInput({
    position: nextPosition,
  });
}

/**
 * Processes one frame of the input loop.
 *
 * @param transport - Match communication channel
 * @param refs - Input loop references
 * @param enabled - If `false`, movement is not sent
 * @param now - Frame timestamp in milliseconds
 * @param lastFrameTime - Previous frame timestamp
 */
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

/**
 * Registers the keyboard listeners and returns the removal function.
 *
 * @param pressed - Reference containing the movement key state
 */
function attachKeyboard(
  pressed: MutableRefObject<PressedKeys>,
  onServe: () => void,
) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) onServe();
      return;
    }
    setDirectionPressed(pressed, event.code, true);
  };
  const onKeyUp = (event: KeyboardEvent) =>
    setDirectionPressed(pressed, event.code, false);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

/** Updates the state of the direction associated with a key. */
function setDirectionPressed(
  pressed: MutableRefObject<PressedKeys>,
  code: string,
  isPressed: boolean,
): void {
  const direction = getMoveDirection(code);
  if (direction) pressed.current[direction] = isPressed;
}

/**
 * Starts the input frame loop and returns the function that stops it.
 *
 * @param transport - Match communication channel
 * @param refs - Input loop references
 * @param enabled - Whether movement sending is enabled
 */
function startInputLoop(
  transport: Transport,
  refs: InputLoopRefs,
  enabled: boolean,
): () => void {
  let frameId = 0;
  const lastFrameTime = { current: 0 };

  /** Processes one frame and schedules the next. */
  function tick(now: number): void {
    runInputFrame(transport, refs, enabled, now, lastFrameTime);
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

/**
 * Hook that reads W/S and the arrow keys and sends the paddle position through the transport.
 *
 * @param transport - Match communication channel
 * @param options.enabled - If `false`, ignores movement (e.g., when the match has ended)
 */
export function usePaddleInput(
  transport: Transport,
  { enabled, paddlePosition: serverPaddlePosition }: UsePaddleInputOptions,
) {
  const paddlePosition = useRef(serverPaddlePosition);
  const wasEnabled = useRef(enabled);
  const pressed = useRef<PressedKeys>({ moveUp: false, moveDown: false });

  useEffect(() => {
    if (!enabled) pressed.current = { moveUp: false, moveDown: false };
    if (!enabled || !wasEnabled.current)
      paddlePosition.current = serverPaddlePosition;
    wasEnabled.current = enabled;
  }, [enabled, serverPaddlePosition]);

  useEffect(() => {
    const refs = { paddlePosition, pressed };
    const detachKeyboard = attachKeyboard(pressed, () => {
      if (enabled) transport.requestServe();
    });
    const stopLoop = startInputLoop(transport, refs, enabled);
    return () => {
      stopLoop();
      detachKeyboard();
    };
  }, [transport, enabled]);
}
