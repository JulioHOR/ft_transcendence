import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  createChatTransport,
  fetchChatHistory,
  type ChatMessage,
  type ChatTransport,
} from "../api/chat";
import {
  appendPrivateMessage,
  historyToClientState,
  upsertPrivateChatTab,
  type PrivateChatTab,
} from "../chat/privateChat";
import { useAuth } from "./auth-session";
import { ChatContext, type ChatContextValue } from "./chat-session";

type ChatProviderProps = {
  children: ReactNode;
};

type ChatState = {
  globalMessages: ChatMessage[];
  privateMessagesByConversation: Record<string, ChatMessage[]>;
  privateChatTabs: PrivateChatTab[];
  unreadByConversation: Record<string, number>;
  error: string | null;
  setGlobalMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPrivateMessages: Dispatch<SetStateAction<Record<string, ChatMessage[]>>>;
  setPrivateChatTabs: Dispatch<SetStateAction<PrivateChatTab[]>>;
  setUnread: Dispatch<SetStateAction<Record<string, number>>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

/** Estado do chat no frontend. */
function useChatState(): ChatState {
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [privateMessagesByConversation, setPrivateMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [privateChatTabs, setPrivateChatTabs] = useState<PrivateChatTab[]>([]);
  const [unreadByConversation, setUnread] = useState<Record<string, number>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  return {
    globalMessages,
    privateMessagesByConversation,
    privateChatTabs,
    unreadByConversation,
    error,
    setGlobalMessages,
    setPrivateMessages,
    setPrivateChatTabs,
    setUnread,
    setError,
  };
}

/** Zera o estado ao sair da sessão. */
function clearChatState(state: ChatState): void {
  state.setGlobalMessages([]);
  state.setPrivateMessages({});
  state.setPrivateChatTabs([]);
  state.setUnread({});
  state.setError(null);
}

/** Aplica GET /chat/history no estado. */
function loadChatHistory(
  cancelled: () => boolean,
  state: ChatState,
): void {
  void fetchChatHistory()
    .then((history) => {
      if (cancelled()) return;
      const mapped = historyToClientState(history);
      state.setGlobalMessages(history.global);
      state.setPrivateMessages(mapped.privateMessagesByConversation);
      state.setPrivateChatTabs(mapped.privateChatTabs);
      state.setError(null);
    })
    .catch((failure: unknown) => {
      if (!cancelled()) {
        state.setError(
          failure instanceof Error ? failure.message : "falha no chat",
        );
      }
    });
}

/** Aplica mensagem privada recebida do socket. */
function applyPrivateLiveMessage(
  message: ChatMessage,
  userId: number,
  viewingRef: MutableRefObject<string | null>,
  state: ChatState,
): void {
  state.setPrivateMessages((current) => appendPrivateMessage(current, message));
  if (message.userId === userId || message.conversationId == null) return;
  const conversationId = message.conversationId;
  state.setPrivateChatTabs((current) =>
    upsertPrivateChatTab(current, {
      conversationId,
      otherUserId: message.userId,
      otherNickname: message.nickname,
    }),
  );
  if (viewingRef.current === conversationId) return;
  state.setUnread((current) => ({
    ...current,
    [conversationId]: (current[conversationId] ?? 0) + 1,
  }));
}

/** Registra handlers e abre o socket. */
function bindAndConnectSocket(
  transport: ChatTransport,
  userId: number,
  viewingRef: MutableRefObject<string | null>,
  cancelled: () => boolean,
  state: ChatState,
): void {
  transport.onGlobalMessage((message) => {
    state.setGlobalMessages((current) => [...current, message]);
  });
  transport.onPrivateMessage((message) => {
    applyPrivateLiveMessage(message, userId, viewingRef, state);
  });
  transport.onPrivateError(state.setError);
  void transport.connect().catch((failure: unknown) => {
    if (!cancelled()) {
      state.setError(
        failure instanceof Error ? failure.message : "falha no chat",
      );
    }
  });
}

/** Inicia histórico + socket; devolve cleanup. */
function startChatSession(
  userId: number,
  viewingRef: MutableRefObject<string | null>,
  transportRef: MutableRefObject<ChatTransport | null>,
  state: ChatState,
): () => void {
  let cancelled = false;
  const isCancelled = () => cancelled;
  const transport = createChatTransport();
  transportRef.current = transport;
  loadChatHistory(isCancelled, state);
  bindAndConnectSocket(transport, userId, viewingRef, isCancelled, state);
  return () => {
    cancelled = true;
    transport.disconnect();
    transportRef.current = null;
  };
}

/**
 * Carrega o histórico e conecta o socket conforme a sessão.
 * Mesmo papel do useFriendsConnection.
 */
function useChatConnection(
  userId: number | null,
  ready: boolean,
  viewingRef: MutableRefObject<string | null>,
  transportRef: MutableRefObject<ChatTransport | null>,
  state: ChatState,
): void {
  useEffect(() => {
    if (!ready || userId == null) {
      clearChatState(state);
      return;
    }
    return startChatSession(userId, viewingRef, transportRef, state);
  }, [ready, userId]);
}

/** Ações de envio. */
function chatSendActions(
  transportRef: MutableRefObject<ChatTransport | null>,
): Pick<ChatContextValue, "sendGlobalMessage" | "sendPrivateMessage"> {
  return {
    sendGlobalMessage: (text) => {
      transportRef.current?.sendGlobalMessage(text);
    },
    sendPrivateMessage: (otherUserId, text) => {
      transportRef.current?.sendPrivateMessage(otherUserId, text);
    },
  };
}

/** Remove a contagem de não lidas de uma conversa. */
function dropUnread(
  current: Record<string, number>,
  conversationId: string,
): Record<string, number> {
  if (current[conversationId] == null) return current;
  const next = { ...current };
  delete next[conversationId];
  return next;
}

/** Ações de abrir/fechar aba. */
function chatOpenCloseActions(
  setPrivateChatTabs: Dispatch<SetStateAction<PrivateChatTab[]>>,
  setUnread: Dispatch<SetStateAction<Record<string, number>>>,
): Pick<ChatContextValue, "openPrivateTab" | "closePrivateTab"> {
  return {
    openPrivateTab: (tab) => {
      setPrivateChatTabs((current) => upsertPrivateChatTab(current, tab));
    },
    closePrivateTab: (conversationId) => {
      setPrivateChatTabs((current) =>
        current.filter((tab) => tab.conversationId !== conversationId),
      );
      setUnread((current) => dropUnread(current, conversationId));
    },
  };
}

/** Ações de foco e leitura. */
function chatViewActions(
  viewingRef: MutableRefObject<string | null>,
  setUnread: Dispatch<SetStateAction<Record<string, number>>>,
): Pick<ChatContextValue, "setViewingConversationId" | "markConversationRead"> {
  return {
    setViewingConversationId: (conversationId) => {
      viewingRef.current = conversationId;
    },
    markConversationRead: (conversationId) => {
      setUnread((current) => dropUnread(current, conversationId));
    },
  };
}

/** Monta o valor publicado no ChatContext. */
function buildChatContextValue(
  state: ChatState,
  transportRef: MutableRefObject<ChatTransport | null>,
  viewingRef: MutableRefObject<string | null>,
): ChatContextValue {
  const unreadTotal = Object.values(state.unreadByConversation).reduce(
    (total, count) => total + count,
    0,
  );
  return {
    globalMessages: state.globalMessages,
    privateMessagesByConversation: state.privateMessagesByConversation,
    privateChatTabs: state.privateChatTabs,
    unreadByConversation: state.unreadByConversation,
    unreadTotal,
    error: state.error,
    ...chatSendActions(transportRef),
    ...chatOpenCloseActions(state.setPrivateChatTabs, state.setUnread),
    ...chatViewActions(viewingRef, state.setUnread),
  };
}

/** Provedor do histórico e socket de chat. */
export function ChatProvider({ children }: ChatProviderProps) {
  const { user, ready } = useAuth();
  const state = useChatState();
  const transportRef = useRef<ChatTransport | null>(null);
  const viewingRef = useRef<string | null>(null);
  useChatConnection(user?.id ?? null, ready, viewingRef, transportRef, state);
  const value = buildChatContextValue(state, transportRef, viewingRef);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
