import { io, type Socket } from "socket.io-client";
import { chatHistoryUrl, chatSocketPath } from "./endpoints";
import { errorMessage } from "./http";

/** Mensagem do chat global ou de uma conversa privada. */
export type ChatMessage = {
  id: string;
  userId: number;
  nickname: string;
  text: string;
  createdAt: number;
  otherUserId?: number;
  conversationId?: string;
};

/** Conversa privada retornada pelo histórico. */
export type PrivateConversationHistory = {
  conversationId: string;
  otherUserId: number;
  otherNickname: string;
  messages: ChatMessage[];
};

/** Resposta de GET /chat/history. */
export type ChatHistory = {
  global: ChatMessage[];
  conversations: PrivateConversationHistory[];
};

/** Transporte Socket.IO do chat. */
export type ChatTransport = {
  connect(): Promise<void>;
  disconnect(): void;
  sendGlobalMessage(text: string): void;
  sendPrivateMessage(otherUserId: number, text: string): void;
  onGlobalMessage(handler: (message: ChatMessage) => void): void;
  onPrivateMessage(handler: (message: ChatMessage) => void): void;
  onPrivateError(handler: (message: string) => void): void;
};

type ChatSocketState = {
  socket: Socket | null;
  globalMessageHandler: ((message: ChatMessage) => void) | null;
  privateMessageHandler: ((message: ChatMessage) => void) | null;
  privateErrorHandler: ((message: string) => void) | null;
};

/** Monta o id da conversa privada a partir do par de users. */
export function buildPrivateConversationId(
  userId: number,
  otherUserId: number,
): string {
  return [userId, otherUserId].sort((left, right) => left - right).join(":");
}

/** Busca o histórico de chat no servidor. */
export async function fetchChatHistory(): Promise<ChatHistory> {
  const response = await fetch(chatHistoryUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "falha ao carregar chat"));
  }
  return response.json() as Promise<ChatHistory>;
}

/** Espera o socket conectar ou falhar. */
function waitForConnection(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

/** Abre a conexão Socket.IO do chat. */
async function connectChat(state: ChatSocketState): Promise<void> {
  state.socket = io({ path: chatSocketPath, withCredentials: true });
  state.socket.on("chat:message", (message: ChatMessage) => {
    state.globalMessageHandler?.(message);
  });
  state.socket.on("chat:private:message", (message: ChatMessage) => {
    state.privateMessageHandler?.(message);
  });
  state.socket.on("chat:private:error", (payload: { message?: string }) => {
    state.privateErrorHandler?.(payload?.message ?? "falha no chat privado");
  });
  await waitForConnection(state.socket);
}

/** Encerra a conexão Socket.IO do chat. */
function disconnectChat(state: ChatSocketState): void {
  state.socket?.disconnect();
  state.socket = null;
  state.globalMessageHandler = null;
  state.privateMessageHandler = null;
  state.privateErrorHandler = null;
}

/** Métodos de envio do transporte. */
function chatSendMethods(
  state: ChatSocketState,
): Pick<ChatTransport, "sendGlobalMessage" | "sendPrivateMessage"> {
  return {
    sendGlobalMessage: (text) => {
      state.socket?.emit("chat:send", { text });
    },
    sendPrivateMessage: (otherUserId, text) => {
      state.socket?.emit("chat:private:send", { otherUserId, text });
    },
  };
}

/** Métodos de registro de handlers do transporte. */
function chatHandlerMethods(
  state: ChatSocketState,
): Pick<
  ChatTransport,
  "onGlobalMessage" | "onPrivateMessage" | "onPrivateError"
> {
  return {
    onGlobalMessage: (handler) => {
      state.globalMessageHandler = handler;
    },
    onPrivateMessage: (handler) => {
      state.privateMessageHandler = handler;
    },
    onPrivateError: (handler) => {
      state.privateErrorHandler = handler;
    },
  };
}

/** Cria o transporte Socket.IO do chat. */
export function createChatTransport(): ChatTransport {
  const state: ChatSocketState = {
    socket: null,
    globalMessageHandler: null,
    privateMessageHandler: null,
    privateErrorHandler: null,
  };
  return {
    connect: () => connectChat(state),
    disconnect: () => disconnectChat(state),
    ...chatSendMethods(state),
    ...chatHandlerMethods(state),
  };
}
