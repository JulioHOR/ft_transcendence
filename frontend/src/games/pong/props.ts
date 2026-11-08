import type { Transport } from "./protocol";

/** Opções para montar a instância visual do Pong. */
export type CreatePongGameOptions = {
  root: HTMLElement;
  transport: Transport;
};
