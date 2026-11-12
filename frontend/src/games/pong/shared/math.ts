/**
 * Calculates the elapsed time between two frames, in seconds.
 * Returns `0` on the first frame (`lastFrameTime === 0`).
 *
 * @param now - Current timestamp in milliseconds
 * @param lastFrameTime - Previous frame timestamp in milliseconds
 */
export function computeDeltaSeconds(
  now: number,
  lastFrameTime: number,
): number {
  if (lastFrameTime === 0) return 0;
  return (now - lastFrameTime) / 1000;
}

/**
 * Clamps a value to the closed interval `[min, max]`.
 *
 * @param value - Value to clamp
 * @param min - Lower bound
 * @param max - Upper bound
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
