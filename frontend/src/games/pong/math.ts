export function computeDeltaSeconds(
  now: number,
  lastFrameTime: number,
): number {
  if (lastFrameTime === 0) return 0;
  return (now - lastFrameTime) / 1000;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
