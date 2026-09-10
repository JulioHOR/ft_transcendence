import { createRoot, type Root } from "react-dom/client";
import { PongApp } from "./PongApp";
import type { Transport } from "./transport/types";

export type PongGameHandle = {
  start(): void;
  stop(): void;
  dispose(): void;
};

export function createPongGame(options: {
  root: HTMLElement;
  transport: Transport;
}): PongGameHandle {
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
