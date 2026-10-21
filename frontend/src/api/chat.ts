import { io, type Socket } from "socket.io-client";
import { chatHistoryUrl, chatSocketPath } from "./endpoints";
import { errorMessage } from "./http";

/** Mensagem do chat global ou de uma conversa privada. */
export type ChatMessage = {
  id: string;
  userId: number;
  nickname: string;
  avatarUrl?: string | null;
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

/** Evento de digitação no chat privado. */
export type PrivateTypingEvent = {
  userId: number;
  nickname: string;
  conversationId: string;
  isTyping: boolean;
};

/** Evento de leitura no chat privado. */
export type PrivateReadEvent = {
  userId: number;
  conversationId: string;
  lastMessageId: string;
};

/** Transporte Socket.IO do chat. */
export type ChatTransport = {
  connect(): Promise<void>;
  disconnect(): void;
  sendGlobalMessage(text: string): void;
  sendPrivateMessage(otherUserId: number, text: string): void;
  sendPrivateTyping(otherUserId: number, isTyping: boolean): void;
  sendPrivateRead(otherUserId: number, lastMessageId: string): void;
  onGlobalMessage(handler: (message: ChatMessage) => void): void;
  onPrivateMessage(handler: (message: ChatMessage) => void): void;
  onPrivateError(handler: (message: string) => void): void;
  onPrivateTyping(handler: (event: PrivateTypingEvent) => void): void;
  onPrivateRead(handler: (event: PrivateReadEvent) => void): void;
};

type ChatHandlers = {
  onGlobal: ((message: ChatMessage) => void) | null;
  onPrivate: ((message: ChatMessage) => void) | null;
  onError: ((message: string) => void) | null;
  onTyping: ((event: PrivateTypingEvent) => void) | null;
  onRead: ((event: PrivateReadEvent) => void) | null;
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

/** Liga os eventos Socket.IO aos handlers. */
function attachSocketListeners(socket: Socket, handlers: ChatHandlers): void {
  socket.on("chat:message", (message: ChatMessage) =>
    handlers.onGlobal?.(message),
  );
  socket.on("chat:private:message", (message: ChatMessage) => {
    handlers.onPrivate?.(message);
  });
  socket.on("chat:private:error", (payload: { message?: string }) => {
    handlers.onError?.(payload?.message ?? "falha no chat privado");
  });
  socket.on("chat:private:typing", (event: PrivateTypingEvent) => {
    handlers.onTyping?.(event);
  });
  socket.on("chat:private:read", (event: PrivateReadEvent) => {
    handlers.onRead?.(event);
  });
}

/** Métodos de envio do transporte. */
function chatSendApi(
  getSocket: () => Socket | null,
): Pick<
  ChatTransport,
  | "sendGlobalMessage"
  | "sendPrivateMessage"
  | "sendPrivateTyping"
  | "sendPrivateRead"
> {
  return {
    sendGlobalMessage: (text) => getSocket()?.emit("chat:send", { text }),
    sendPrivateMessage: (otherUserId, text) =>
      getSocket()?.emit("chat:private:send", { otherUserId, text }),
    sendPrivateTyping: (otherUserId, isTyping) =>
      getSocket()?.emit("chat:private:typing", { otherUserId, isTyping }),
    sendPrivateRead: (otherUserId, lastMessageId) =>
      getSocket()?.emit("chat:private:read", { otherUserId, lastMessageId }),
  };
}

/** Handlers de mensagem e erro. */
function chatMessageHandlers(
  handlers: ChatHandlers,
): Pick<
  ChatTransport,
  "onGlobalMessage" | "onPrivateMessage" | "onPrivateError"
> {
  return {
    onGlobalMessage: (handler) => {
      handlers.onGlobal = handler;
    },
    onPrivateMessage: (handler) => {
      handlers.onPrivate = handler;
    },
    onPrivateError: (handler) => {
      handlers.onError = handler;
    },
  };
}

/** Handlers de typing e read. */
function chatPresenceHandlers(
  handlers: ChatHandlers,
): Pick<ChatTransport, "onPrivateTyping" | "onPrivateRead"> {
  return {
    onPrivateTyping: (handler) => {
      handlers.onTyping = handler;
    },
    onPrivateRead: (handler) => {
      handlers.onRead = handler;
    },
  };
}

/** Abre a conexão do transporte. */
async function connectTransport(
  handlers: ChatHandlers,
  setSocket: (socket: Socket) => void,
): Promise<void> {
  const socket = io({ path: chatSocketPath, withCredentials: true });
  setSocket(socket);
  attachSocketListeners(socket, handlers);
  await waitForConnection(socket);
}

/** Cria um transporte de chat via Socket.IO. */
export function createChatTransport(): ChatTransport {
  let socket: Socket | null = null;
  const handlers: ChatHandlers = {
    onGlobal: null,
    onPrivate: null,
    onError: null,
    onTyping: null,
    onRead: null,
  };
  return {
    connect: () =>
      connectTransport(handlers, (next) => {
        socket = next;
      }),
    disconnect() {
      socket?.disconnect();
      socket = null;
    },
    ...chatSendApi(() => socket),
    ...chatMessageHandlers(handlers),
    ...chatPresenceHandlers(handlers),
  };
}
