import { io, type Socket } from "socket.io-client";
import { apiFetch } from "./api";
import { chatHistoryUrl, socketPath } from "./endpoints";
import { errorMessage } from "./http";

/** Message from the global chat or a private conversation. */
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

/** Private conversation returned by the history. */
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
  blockedUserIds: number[];
  blockingUserIds: number[];
};

/** Match invitation sent within a private conversation. */
export type GameInvitation = {
  inviteId: string;
  senderId: number;
  senderNickname: string;
  recipientId: number;
  recipientNickname: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "started";
};

/** Typing event in the private chat. */
export type PrivateTypingEvent = {
  userId: number;
  nickname: string;
  conversationId: string;
  isTyping: boolean;
};

/** Read event in the private chat. */
export type PrivateReadEvent = {
  userId: number;
  conversationId: string;
  lastMessageId: string;
};

/** Socket.IO chat transport. */
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
  sendGameInvite(otherUserId: number): void;
  respondGameInvite(inviteId: string, accepted: boolean): void;
  cancelGameInvite(inviteId: string): void;
  onGameInvite(handler: (invitation: GameInvitation) => void): void;
  onGameInviteUpdate(handler: (invitation: GameInvitation) => void): void;
};

/** Handlers for chat events. */
type ChatHandlers = {
  onGlobal: ((message: ChatMessage) => void) | null;
  onPrivate: ((message: ChatMessage) => void) | null;
  onError: ((message: string) => void) | null;
  onTyping: ((event: PrivateTypingEvent) => void) | null;
  onRead: ((event: PrivateReadEvent) => void) | null;
  onGameInvite: ((invitation: GameInvitation) => void) | null;
  onGameInviteUpdate: ((invitation: GameInvitation) => void) | null;
};

/** Builds the private conversation ID from a pair of users. */
export function buildPrivateConversationId(
  userId: number,
  otherUserId: number,
): string {
  return [userId, otherUserId].sort((left, right) => left - right).join(":");
}

/** Fetches the chat history from the server. */
export async function fetchChatHistory(): Promise<ChatHistory> {
  const response = await apiFetch(chatHistoryUrl);
  if (!response.ok) {
    throw new Error(await errorMessage(response, "falha ao carregar chat"));
  }
  return response.json() as Promise<ChatHistory>;
}

/** Waits for the socket to connect or fail. */
function waitForConnection(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

/** Attaches event listeners to the socket. */
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
  socket.on("chat:error", (payload: { message?: string }) => {
    handlers.onError?.(payload?.message ?? "falha no chat");
  });
  socket.on("chat:game:invite", (invitation: GameInvitation) => {
    handlers.onGameInvite?.(invitation);
  });
  socket.on("chat:game:invite:update", (invitation: GameInvitation) => {
    handlers.onGameInviteUpdate?.(invitation);
  });
  attachChatPresenceListeners(socket, handlers);
}

/** Attaches typing and read event listeners to the socket. */
function attachChatPresenceListeners(
  socket: Socket,
  handlers: ChatHandlers,
): void {
  socket.on("chat:private:typing", (event: PrivateTypingEvent) => {
    handlers.onTyping?.(event);
  });
  socket.on("chat:private:read", (event: PrivateReadEvent) => {
    handlers.onRead?.(event);
  });
}

/** Transport sending methods. */
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

/** Sending and responding to match invitations. */
function chatGameInviteSendApi(
  getSocket: () => Socket | null,
): Pick<
  ChatTransport,
  "sendGameInvite" | "respondGameInvite" | "cancelGameInvite"
> {
  return {
    sendGameInvite: (otherUserId) =>
      getSocket()?.emit("chat:game:invite", { otherUserId }),
    respondGameInvite: (inviteId, accepted) =>
      getSocket()?.emit("chat:game:invite:respond", { inviteId, accepted }),
    cancelGameInvite: (inviteId) =>
      getSocket()?.emit("chat:game:invite:cancel", { inviteId }),
  };
}

/** Message and error handlers. */
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

/** Typing and read handlers. */
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

/** Registers match invitation events. */
function chatGameInviteHandlers(
  handlers: ChatHandlers,
): Pick<ChatTransport, "onGameInvite" | "onGameInviteUpdate"> {
  return {
    onGameInvite: (handler) => {
      handlers.onGameInvite = handler;
    },
    onGameInviteUpdate: (handler) => {
      handlers.onGameInviteUpdate = handler;
    },
  };
}

/** Opens the transport connection. */
async function connectTransport(
  handlers: ChatHandlers,
  setSocket: (socket: Socket) => void,
): Promise<void> {
  const socket = io({ path: socketPath, withCredentials: true });
  setSocket(socket);
  attachSocketListeners(socket, handlers);
  await waitForConnection(socket);
}

/** Creates a chat transport via Socket.IO. */
export function createChatTransport(): ChatTransport {
  let socket: Socket | null = null;
  const handlers = createChatHandlers();
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
    ...chatGameInviteSendApi(() => socket),
    ...chatMessageHandlers(handlers),
    ...chatPresenceHandlers(handlers),
    ...chatGameInviteHandlers(handlers),
  };
}

/** Creates handlers that are initially unsubscribed. */
function createChatHandlers(): ChatHandlers {
  return {
    onGlobal: null,
    onPrivate: null,
    onError: null,
    onTyping: null,
    onRead: null,
    onGameInvite: null,
    onGameInviteUpdate: null,
  };
}

/** Blocks private messages sent by a user. */
export async function blockChatUser(userId: number): Promise<void> {
  await updateChatBlock(userId, "POST");
}

/** Allows private messages from a user again. */
export async function unblockChatUser(userId: number): Promise<void> {
  await updateChatBlock(userId, "DELETE");
}

/** Applies or removes a user's message block. */
async function updateChatBlock(userId: number, method: "POST" | "DELETE") {
  const response = await apiFetch(`/api/chat/blocks/${userId}`, {
    method,
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "falha ao atualizar bloqueio"),
    );
  }
}
