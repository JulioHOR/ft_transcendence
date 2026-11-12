import { createRoot, type Root } from "react-dom/client";
import { PongApp } from "./view/PongApp";
import type { CreatePongGameOptions } from "./props";

/**
 * Controls mounting Pong into a DOM element.
 */
export type PongGameHandle = {
  /** Mounts and starts rendering. */
  start(): void;
  /** Pauses rendering. */
  stop(): void;
  /** Unmounts the application from the element. */
  dispose(): void;
};

/**
 * Renders Pong in a DOM element using the provided transport.
 *
 * @param options.root - Element where the game will be mounted
 * @param options.transport - Match communication channel
 */
export function createPongGame(options: CreatePongGameOptions): PongGameHandle {
  const { root, transport } = options;
  let reactRoot: Root | null = null;

  return {
    start() {
      if (reactRoot) return;
      reactRoot = createRoot(root);
      reactRoot.render(<PongApp transport={transport} />);
    },
    stop() {},
    dispose() {
      reactRoot?.unmount();
      reactRoot = null;
    },
  };
}
