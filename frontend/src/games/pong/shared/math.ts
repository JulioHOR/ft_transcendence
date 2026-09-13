/**
 * Calcula o tempo decorrido entre dois frames, em segundos.
 * Retorna `0` no primeiro frame (`lastFrameTime === 0`).
 *
 * @param now - Timestamp atual em milissegundos
 * @param lastFrameTime - Timestamp do frame anterior em milissegundos
 */
export function computeDeltaSeconds(
  now: number,
  lastFrameTime: number,
): number {
  if (lastFrameTime === 0) return 0;
  return (now - lastFrameTime) / 1000;
}

/**
 * Restringe um valor ao intervalo fechado `[min, max]`.
 *
 * @param value - Valor a limitar
 * @param min - Limite inferior
 * @param max - Limite superior
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
