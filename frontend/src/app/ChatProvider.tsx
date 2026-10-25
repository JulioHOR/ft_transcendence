import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  createChatTransport,
  fetchChatHistory,
  buildPrivateConversationId,
  blockChatUser,
  unblockChatUser,
  type ChatMessage,
  type GameInvitation,
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
import { useLatestRef } from "./useLatestRef";

type ChatProviderProps = {
  children: ReactNode;
};

type ChatSetters = {
  setGlobal: Dispatch<SetStateAction<ChatMessage[]>>;
  setPrivate: Dispatch<SetStateAction<Record<string, ChatMessage[]>>>;
  setTabs: Dispatch<SetStateAction<PrivateChatTab[]>>;
  setUnread: Dispatch<SetStateAction<Record<string, number>>>;
  setTyping: Dispatch<SetStateAction<Record<string, string | null>>>;
  setPeerRead: Dispatch<SetStateAction<Record<string, string>>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setBlockedUsers: Dispatch<SetStateAction<number[]>>;
  setBlockingUsers: Dispatch<SetStateAction<number[]>>;
  setGameInvitations: Dispatch<SetStateAction<GameInvitation[]>>;
};

type ChatProviderState = {
  globalMessages: ChatMessage[];
  privateMessagesByConversation: Record<string, ChatMessage[]>;
  privateChatTabs: PrivateChatTab[];
  unreadByConversation: Record<string, number>;
  typingByConversation: Record<string, string | null>;
  peerReadByConversation: Record<string, string>;
  error: string | null;
  blockedUserIds: number[];
  blockingUserIds: number[];
  gameInvitations: GameInvitation[];
  setters: ChatSetters;
  transportRef: { current: ChatTransport | null };
  viewingRef: { current: string | null };
};

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

/** Aplica mensagem privada recebida ao vivo. */
function applyPrivateMessage(
  message: ChatMessage,
  userId: number,
  viewingRef: { current: string | null },
  setters: ChatSetters,
): void {
  setters.setPrivate((current) => appendPrivateMessage(current, message));
  if (message.userId === userId || message.conversationId == null) return;
  const id = message.conversationId;
  setters.setTabs((current) =>
    upsertPrivateChatTab(current, {
      conversationId: id,
      otherUserId: message.userId,
      otherNickname: message.nickname,
    }),
  );
  setters.setTyping((current) => ({ ...current, [id]: null }));
  if (viewingRef.current === id) return;
  setters.setUnread((current) => ({
    ...current,
    [id]: (current[id] ?? 0) + 1,
  }));
}

/** Typing e recibos de leitura no socket privado. */
function bindPrivateSignals(
  transport: ChatTransport,
  setters: ChatSetters,
): void {
  transport.onPrivateTyping((event) => {
    setters.setTyping((current) => ({
      ...current,
      [event.conversationId]: event.isTyping ? event.nickname : null,
    }));
  });
  transport.onPrivateRead((event) => {
    setters.setPeerRead((current) => ({
      ...current,
      [event.conversationId]: event.lastMessageId,
    }));
  });
}

/** Liga handlers do socket. */
function bindTransport(
  transport: ChatTransport,
  userId: number,
  viewingRef: { current: string | null },
  setters: ChatSetters,
): void {
  const seenInvitationIds = new Set<string>();
  transport.onGlobalMessage((message) => {
    setters.setGlobal((current) => [...current, message]);
  });
  transport.onPrivateMessage((message) => {
    applyPrivateMessage(message, userId, viewingRef, setters);
  });
  transport.onPrivateError(setters.setError);
  transport.onGameInvite((invitation) => {
    receiveGameInvitation(invitation, userId, viewingRef, setters, seenInvitationIds);
  });
  transport.onGameInviteUpdate((invitation) => {
    receiveGameInvitation(invitation, userId, viewingRef, setters, seenInvitationIds);
  });
  bindPrivateSignals(transport, setters);
}

/** Abre a conversa e marca convites recebidos como não lidos. */
function receiveGameInvitation(
  invitation: GameInvitation,
  userId: number,
  viewingRef: { current: string | null },
  setters: ChatSetters,
  seenInvitationIds: Set<string>,
): void {
  const active =
    invitation.status !== "declined" &&
    invitation.status !== "cancelled" &&
    invitation.status !== "started";
  if (active && !seenInvitationIds.has(invitation.inviteId)) {
    seenInvitationIds.add(invitation.inviteId);
    const conversationId = openInvitationConversation(invitation, userId, setters);
    markInvitationUnread(invitation, userId, conversationId, viewingRef, setters);
  }
  updateGameInvitation(setters, invitation);
}

/** Cria a aba privada correspondente ao convite. */
function openInvitationConversation(
  invitation: GameInvitation,
  userId: number,
  setters: ChatSetters,
): string {
  const isSender = invitation.senderId === userId;
  const otherUserId = isSender ? invitation.recipientId : invitation.senderId;
  const otherNickname = isSender
    ? invitation.recipientNickname
    : invitation.senderNickname;
  const conversationId = buildPrivateConversationId(userId, otherUserId);
  setters.setTabs((current) =>
    upsertPrivateChatTab(current, { conversationId, otherUserId, otherNickname }),
  );
  return conversationId;
}

/** Marca o convite recebido como não lido quando sua conversa não está aberta. */
function markInvitationUnread(
  invitation: GameInvitation,
  userId: number,
  conversationId: string,
  viewingRef: { current: string | null },
  setters: ChatSetters,
): void {
  if (invitation.recipientId !== userId || viewingRef.current === conversationId) {
    return;
  }
  setters.setUnread((current) => ({
    ...current,
    [conversationId]: (current[conversationId] ?? 0) + 1,
  }));
}

/** Atualiza o convite e remove avisos de resultado após alguns segundos. */
function updateGameInvitation(
  setters: ChatSetters,
  invitation: GameInvitation,
): void {
  if (invitation.status === "started") {
    setters.setGameInvitations((current) =>
      current.filter((item) => item.inviteId !== invitation.inviteId),
    );
    return;
  }
  setters.setGameInvitations((current) => upsertGameInvitation(current, invitation));
  if (invitation.status === "declined" || invitation.status === "cancelled") {
    setTimeout(() => {
      setters.setGameInvitations((current) =>
        current.filter((item) => item.inviteId !== invitation.inviteId),
      );
    }, 5000);
  }
}

/** Atualiza um convite recebido por chat ou pelo servidor. */
function upsertGameInvitation(
  current: GameInvitation[],
  invitation: GameInvitation,
): GameInvitation[] {
  return [
    ...current.filter((item) => item.inviteId !== invitation.inviteId),
    invitation,
  ];
}

/** Limpa estado ao sair. */
function clearState(setters: ChatSetters): void {
  setters.setGlobal([]);
  setters.setPrivate({});
  setters.setTabs([]);
  setters.setUnread({});
  setters.setTyping({});
  setters.setPeerRead({});
  setters.setBlockedUsers([]);
  setters.setBlockingUsers([]);
  setters.setGameInvitations([]);
  setters.setError(null);
}

/** Carrega histórico HTTP. */
function loadHistory(cancelled: () => boolean, setters: ChatSetters): void {
  void fetchChatHistory()
    .then((history) => {
      if (cancelled()) return;
      const mapped = historyToClientState(history);
      setters.setGlobal(history.global);
      setters.setPrivate(mapped.privateMessagesByConversation);
      setters.setTabs(mapped.privateChatTabs);
      setters.setBlockedUsers(history.blockedUserIds ?? []);
      setters.setBlockingUsers(history.blockingUserIds ?? []);
      setters.setError(null);
    })
    .catch((failure: unknown) => {
      if (!cancelled()) {
        setters.setError(
          failure instanceof Error ? failure.message : "falha no chat",
        );
      }
    });
}

/** Abre transporte e devolve cleanup. */
function openChatTransport(
  userId: number,
  transportRef: { current: ChatTransport | null },
  viewingRef: { current: string | null },
  setters: ChatSetters,
): () => void {
  let cancelled = false;
  const transport = createChatTransport();
  transportRef.current = transport;
  bindTransport(transport, userId, viewingRef, setters);
  loadHistory(() => cancelled, setters);
  void transport.connect().catch((failure: unknown) => {
    if (!cancelled) {
      setters.setError(
        failure instanceof Error ? failure.message : "falha no chat",
      );
    }
  });
  return () => {
    cancelled = true;
    transport.disconnect();
    transportRef.current = null;
  };
}

/** Conecta histórico + socket (mesmo papel do useFriendsConnection). */
function useChatConnection(
  userId: number | null,
  ready: boolean,
  transportRef: { current: ChatTransport | null },
  viewingRef: { current: string | null },
  setters: ChatSetters,
): void {
  const settersRef = useLatestRef(setters);
  useEffect(() => {
    if (!ready || userId == null) {
      clearState(settersRef.current);
      return;
    }
    return openChatTransport(
      userId,
      transportRef,
      viewingRef,
      settersRef.current,
    );
  }, [ready, userId, transportRef, viewingRef, settersRef]);
}

/** Envio via socket. */
function transportSendActions(transportRef: {
  current: ChatTransport | null;
}): Pick<
  ChatContextValue,
  "sendGlobalMessage" | "sendPrivateMessage" | "sendPrivateTyping" | "notifyPrivateRead"
> {
  return {
    sendGlobalMessage: (text) => transportRef.current?.sendGlobalMessage(text),
    sendPrivateMessage: (id, text) =>
      transportRef.current?.sendPrivateMessage(id, text),
    sendPrivateTyping: (id, isTyping) =>
      transportRef.current?.sendPrivateTyping(id, isTyping),
    notifyPrivateRead: (id, lastMessageId) =>
      transportRef.current?.sendPrivateRead(id, lastMessageId),
  };
}

/** Ações de convite de partida no chat. */
function gameInviteActions(transportRef: {
  current: ChatTransport | null;
}): Pick<
  ChatContextValue,
  "sendGameInvite" | "respondGameInvite" | "cancelGameInvite"
> {
  return {
    sendGameInvite: (id) => transportRef.current?.sendGameInvite(id),
    respondGameInvite: (id, accepted) =>
      transportRef.current?.respondGameInvite(id, accepted),
    cancelGameInvite: (id) => transportRef.current?.cancelGameInvite(id),
  };
}

/** Atualiza o bloqueio local depois da resposta do servidor. */
function chatBlockActions(
  setters: ChatSetters,
): Pick<ChatContextValue, "blockUser" | "unblockUser"> {
  return {
    blockUser: (userId) => updateChatBlock(userId, true, setters),
    unblockUser: (userId) => updateChatBlock(userId, false, setters),
  };
}

/** Persiste o bloqueio e atualiza o estado da conversa. */
function updateChatBlock(
  userId: number,
  blocked: boolean,
  setters: ChatSetters,
): void {
  const update = blocked ? blockChatUser : unblockChatUser;
  void update(userId)
    .then(() =>
      setters.setBlockedUsers((current) =>
        updateBlockedUserIds(current, userId, blocked),
      ),
    )
    .catch((failure: unknown) =>
      setters.setError(
        failure instanceof Error
          ? failure.message
          : blocked
            ? "falha ao bloquear usuário"
            : "falha ao desbloquear usuário",
      ),
    );
}

/** Atualiza a lista local de usuários bloqueados. */
function updateBlockedUserIds(
  current: number[],
  userId: number,
  blocked: boolean,
): number[] {
  if (!blocked) return current.filter((blockedId) => blockedId !== userId);
  return current.includes(userId) ? current : [...current, userId];
}

/** Abas e leitura local. */
type TabViewActions = Pick<
  ChatContextValue,
  | "openPrivateTab"
  | "closePrivateTab"
  | "setViewingConversationId"
  | "markConversationRead"
>;

function tabViewActions(
  viewingRef: { current: string | null },
  setters: ChatSetters,
): TabViewActions {
  return {
    openPrivateTab: (tab) =>
      setters.setTabs((current) => upsertPrivateChatTab(current, tab)),
    closePrivateTab: (conversationId) => {
      setters.setTabs((current) =>
        current.filter((tab) => tab.conversationId !== conversationId),
      );
      setters.setUnread((current) => dropUnread(current, conversationId));
    },
    setViewingConversationId: (id) => (viewingRef.current = id),
    markConversationRead: (id) =>
      setters.setUnread((current) => dropUnread(current, id)),
  };
}

/** Mensagens e abas privadas. */
function useChatListsState() {
  const [globalMessages, setGlobal] = useState<ChatMessage[]>([]);
  const [privateMessagesByConversation, setPrivate] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [privateChatTabs, setTabs] = useState<PrivateChatTab[]>([]);
  return {
    globalMessages,
    privateMessagesByConversation,
    privateChatTabs,
    setGlobal,
    setPrivate,
    setTabs,
  };
}

/** Não lidas, typing, leitura e erro. */
function useChatMetaState() {
  const [unreadByConversation, setUnread] = useState<Record<string, number>>(
    {},
  );
  const [typingByConversation, setTyping] = useState<
    Record<string, string | null>
  >({});
  const [peerReadByConversation, setPeerRead] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  return {
    unreadByConversation,
    typingByConversation,
    peerReadByConversation,
    error,
    setUnread,
    setTyping,
    setPeerRead,
    setError,
  };
}

/** Estado de bloqueios e convites de partida. */
function useChatRestrictionState() {
  const [blockedUserIds, setBlockedUsers] = useState<number[]>([]);
  const [blockingUserIds, setBlockingUsers] = useState<number[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  return {
    blockedUserIds,
    blockingUserIds,
    gameInvitations,
    setBlockedUsers,
    setBlockingUsers,
    setGameInvitations,
  };
}

/** Monta setters a partir dos hooks de estado. */
function chatSettersFrom(
  lists: ReturnType<typeof useChatListsState>,
  meta: ReturnType<typeof useChatMetaState>,
  restrictions: ReturnType<typeof useChatRestrictionState>,
): ChatSetters {
  return {
    setGlobal: lists.setGlobal,
    setPrivate: lists.setPrivate,
    setTabs: lists.setTabs,
    setUnread: meta.setUnread,
    setTyping: meta.setTyping,
    setPeerRead: meta.setPeerRead,
    setError: meta.setError,
    setBlockedUsers: restrictions.setBlockedUsers,
    setBlockingUsers: restrictions.setBlockingUsers,
    setGameInvitations: restrictions.setGameInvitations,
  };
}

/** Estado React do provedor de chat. */
function useChatProviderState(): ChatProviderState {
  const lists = useChatListsState();
  const chatMeta = useChatMetaState();
  const restrictions = useChatRestrictionState();
  const meta = { ...chatMeta, ...restrictions };
  const transportRef = useRef<ChatTransport | null>(null);
  const viewingRef = useRef<string | null>(null);
  return {
    globalMessages: lists.globalMessages,
    privateMessagesByConversation: lists.privateMessagesByConversation,
    privateChatTabs: lists.privateChatTabs,
    unreadByConversation: meta.unreadByConversation,
    typingByConversation: meta.typingByConversation,
    peerReadByConversation: meta.peerReadByConversation,
    error: meta.error,
    blockedUserIds: meta.blockedUserIds,
    blockingUserIds: meta.blockingUserIds,
    gameInvitations: meta.gameInvitations,
    setters: chatSettersFrom(lists, chatMeta, restrictions),
    transportRef,
    viewingRef,
  };
}

/** Valor exposto no contexto. */
function buildChatContextValue(state: ChatProviderState): ChatContextValue {
  const unreadTotal = Object.values(state.unreadByConversation).reduce(
    (total, count) => total + count,
    0,
  );
  return {
    globalMessages: state.globalMessages,
    privateMessagesByConversation: state.privateMessagesByConversation,
    privateChatTabs: state.privateChatTabs,
    unreadByConversation: state.unreadByConversation,
    typingByConversation: state.typingByConversation,
    peerReadByConversation: state.peerReadByConversation,
    unreadTotal,
    error: state.error,
    blockedUserIds: state.blockedUserIds,
    blockingUserIds: state.blockingUserIds,
    gameInvitations: state.gameInvitations,
    clearError: () => state.setters.setError(null),
    ...transportSendActions(state.transportRef),
    ...gameInviteActions(state.transportRef),
    ...chatBlockActions(state.setters),
    ...tabViewActions(state.viewingRef, state.setters),
  };
}

/** Provedor do histórico e socket de chat. */
export function ChatProvider({ children }: ChatProviderProps) {
  const { user, ready } = useAuth();
  const state = useChatProviderState();
  useChatConnection(
    user?.id ?? null,
    ready,
    state.transportRef,
    state.viewingRef,
    state.setters,
  );
  return (
    <ChatContext.Provider value={buildChatContextValue(state)}>
      {children}
    </ChatContext.Provider>
  );
}
