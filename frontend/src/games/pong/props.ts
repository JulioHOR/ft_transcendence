import type { Transport } from "./protocol";

/** Options for mounting a visual Pong instance. */
export type CreatePongGameOptions = {
  root: HTMLElement;
  transport: Transport;
};
