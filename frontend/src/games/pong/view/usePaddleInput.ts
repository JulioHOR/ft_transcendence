import { useEffect, useRef, type MutableRefObject } from "react";
import type { Transport } from "../protocol";
import { TABLE } from "../protocol";
import { clamp, computeDeltaSeconds } from "../shared/math";

/** Velocidade de deslocamento da paddle no eixo Z (largura). */
const PADDLE_SPEED = 8;
const MOVE_UP_CODES = new Set(["KeyW", "ArrowUp"]);
const MOVE_DOWN_CODES = new Set(["KeyS", "ArrowDown"]);

type MoveDirection = "moveUp" | "moveDown";
type PressedKeys = Record<MoveDirection, boolean>;
type UsePaddleInputOptions = { enabled: boolean };

/**
 * Converte um código de tecla em direção de movimento, ou `null`
 * se a tecla não controla a paddle.
 */
function getMoveDirection(code: string): MoveDirection | null {
  if (MOVE_UP_CODES.has(code)) return "moveUp";
  if (MOVE_DOWN_CODES.has(code)) return "moveDown";
  return null;
}

/**
 * Limita a posição da paddle no eixo Z (largura) às bordas da mesa.
 *
 * @param offset - Posição candidata no eixo Z (largura)
 */
function clampPaddleOffset(offset: number): number {
  return clamp(offset, -TABLE.halfWidth, TABLE.halfWidth);
}

/**
 * Calcula o deslocamento no eixo Z (largura) para uma direção e intervalo de tempo.
 *
 * @param direction - Direção do movimento
 * @param deltaSeconds - Tempo decorrido, em segundos
 */
function movementDelta(direction: MoveDirection, deltaSeconds: number): number {
  const distance = PADDLE_SPEED * deltaSeconds;
  return direction === "moveUp" ? -distance : distance;
}

/**
 * Calcula a próxima posição da paddle no eixo Z (largura) a partir das teclas pressionadas.
 *
 * @param currentOffset - Posição atual no eixo Z (largura)
 * @param pressed - Estado das teclas de movimento
 * @param deltaSeconds - Tempo decorrido, em segundos
 */
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

/** Indica se há alguma tecla de movimento pressionada. */
function hasMovementInput(pressed: PressedKeys): boolean {
  return pressed.moveUp || pressed.moveDown;
}

type InputLoopRefs = {
  paddleOffset: MutableRefObject<number>;
  inputSequence: MutableRefObject<number>;
  pressed: MutableRefObject<PressedKeys>;
};

/**
 * Atualiza a posição local da paddle e envia o input pelo transport.
 *
 * @param transport - Canal de comunicação da partida
 * @param refs - Referências do loop de input
 * @param pressed - Estado das teclas
 * @param deltaSeconds - Tempo decorrido, em segundos
 */
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

/**
 * Processa um frame do loop de input.
 *
 * @param transport - Canal de comunicação da partida
 * @param refs - Referências do loop de input
 * @param enabled - Se `false`, não envia movimento
 * @param now - Timestamp do frame, em milissegundos
 * @param lastFrameTime - Timestamp do frame anterior
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
 * Registra os listeners de teclado e retorna a função de remoção.
 *
 * @param pressed - Referência com o estado das teclas de movimento
 */
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

/**
 * Inicia o loop de frames de input e retorna a função que o interrompe.
 *
 * @param transport - Canal de comunicação da partida
 * @param refs - Referências do loop de input
 * @param enabled - Se o envio de movimento está ativo
 */
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

/**
 * Hook que lê W/S e setas e envia a posição da paddle pelo transport.
 *
 * @param transport - Canal de comunicação da partida
 * @param options.enabled - Se `false`, ignora o movimento (ex.: partida encerrada)
 */
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
