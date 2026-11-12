import type { Side } from "./types";

/**
 * Table dimensions in 3D world units (Three.js, Y points upward).
 *
 * Orientation used throughout this module:
 * - X: table length (goal to goal)
 * - Z: table width (paddle movement)
 * - Y: height (nearly fixed in physics; used only for 3D rendering)
 */
export const TABLE = {
  /** Half the table length. */
  halfLength: 10,
  /** Half the table width. */
  halfWidth: 5,
  /** Position of the paddle face on the X axis (length). */
  paddleX: 9,
  /** Half the paddle height. */
  paddleHalfDepth: 0.8,
  /** Ball radius. */
  ballRadius: 0.35,
} as const;

export const inputLimit = TABLE.halfWidth - TABLE.paddleHalfDepth;

/** Number of points required to win the match. */
export const POINTS_TO_WIN = 3;

/**
 * Returns the X coordinate (length) of the paddle face.
 *
 * @param side - Table side
 */
export function getPaddleX(side: Side): number {
  return (side === "left" ? -1 : 1) * TABLE.paddleX;
}
