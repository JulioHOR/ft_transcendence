import type { Side } from "./types";

/** Shared table layout — client draws with this; server should use the same numbers. */
export const TABLE = {
  halfLength: 10,
  halfWidth: 5,
  paddleX: 9,
  paddleHalfDepth: 1,
  ballRadius: 0.35,
} as const;

export const POINTS_TO_WIN = 5;

export function getPaddleX(side: Side): number {
  return (side === "left" ? -1 : 1) * TABLE.paddleX;
}
