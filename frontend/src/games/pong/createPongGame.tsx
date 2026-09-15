import { createRoot, type Root } from "react-dom/client";
import { PongApp } from "./view/PongApp";
import type { Transport } from "./protocol";

/**
 * Controle de montagem do Pong em um elemento DOM.
 */
export type PongGameHandle = {
  /** Monta e inicia a renderização. */
  start(): void;
  stop(): void;
  /** Desmonta a aplicação do elemento. */
  dispose(): void;
};

/**
 * Renderiza o Pong em um elemento DOM usando o transport informado.
 *
 * @param options.root - Elemento onde o jogo será montado
 * @param options.transport - Canal de comunicação da partida
 */
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
