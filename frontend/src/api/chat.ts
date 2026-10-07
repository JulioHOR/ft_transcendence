import { io, type Socket } from "socket.io-client";
import { chatSocketPath } from "./endpoints";
import { getProfile } from "./profile";

/** Mensagem do chat global. */
export type ChatMessage = {
  id: string;
  userId: number;
  nickname: string;
  text: string;
  createdAt: number;
};

/** Interface de transporte do chat. */
export type ChatTransport = {
  connect(): Promise<void>;
  disconnect(): void;
  send(text: string): void;
  onMessage(handler: (message: ChatMessage) => void): void;
};

/** Estado interno do socket do chat. */
type ChatSocketState = {
  socket: Socket | null;
  messageHandler: ((message: ChatMessage) => void) | null;
};

/** Espera o socket conectar ou falhar. */
function waitForConnection(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

/** Abre a conexão Socket.IO do chat. */
async function connectChat(state: ChatSocketState): Promise<void> {
  state.socket = io({ path: chatSocketPath });
  state.socket.on("chat:message", (message: ChatMessage) => {
    state.messageHandler?.(message);
  });
  await waitForConnection(state.socket);
}

/** Encerra a conexão Socket.IO do chat. */
function disconnectChat(state: ChatSocketState): void {
  state.socket?.disconnect();
  state.socket = null;
  state.messageHandler = null;
}

/** Envia uma mensagem no chat com os dados do perfil atual. */
function sendChatMessage(state: ChatSocketState, text: string): void {
  void getProfile().then((user) => {
    state.socket?.emit("chat:send", {
      text,
      userId: user.id,
      nickname: user.nickname,
    });
  });
}

/** Cria o transporte de chat apontando para o path em endpoints. */
export function createChatTransport(): ChatTransport {
  const state: ChatSocketState = { socket: null, messageHandler: null };
  return {
    connect: () => connectChat(state),
    disconnect: () => disconnectChat(state),
    send: (text) => sendChatMessage(state, text),
    onMessage: (handler) => {
      state.messageHandler = handler;
    },
  };
}
