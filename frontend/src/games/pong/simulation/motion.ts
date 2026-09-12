import type { SimState } from "./types";

export function moveBall(state: SimState, deltaSeconds: number): void {
  state.ballX += state.velocityX * deltaSeconds;
  state.ballZ += state.velocityZ * deltaSeconds;
}
