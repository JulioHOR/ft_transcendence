import { useEffect, useRef, useState } from "react";
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
import { friendlyError } from "../api/http";
import {
  appendPrivateMessage,
  historyToClientState,
  upsertPrivateChatTab,
  type PrivateChatTab,
} from "../chat/privateChat";
import { useAuth } from "./auth-session";
import { ChatContext, type ChatContextValue } from "./chat-session";
import { useLatestRef } from "./useLatestRef";
import type {
  ChatProviderProps,
  ChatProviderState,
  ChatSetters,
  ChatTransportRef,
  ChatViewingRef,
} from "./props";

/** Clears a conversation's unread count. */
function dropUnread(
  current: Record<string, number>,
  conversationId: string,
): Record<string, number> {
  if (current[conversationId] == null) return current;
  const next = { ...current };
  delete next[conversationId];
  return next;
}

/** Applies a privately received live message. */
function applyPrivateMessage(
  message: ChatMessage,
  userId: number,
  viewingRef: ChatViewingRef,
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

/** Typing and read receipts on the private socket. */
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

/** Attaches the socket handlers. */
function bindTransport(
  transport: ChatTransport,
  userId: number,
  viewingRef: ChatViewingRef,
  setters: ChatSetters,
): void {
  transport.onGlobalMessage((message) => {
    setters.setGlobal((current) => [...current, message]);
  });
  transport.onPrivateMessage((message) => {
    applyPrivateMessage(message, userId, viewingRef, setters);
  });
  transport.onPrivateError(setters.setError);
  bindGameInvitationEvents(transport, userId, viewingRef, setters);
  bindPrivateSignals(transport, setters);
}

/** Connects invitation events to the context handlers. */
function bindGameInvitationEvents(
  transport: ChatTransport,
  userId: number,
  viewingRef: ChatViewingRef,
  setters: ChatSetters,
): void {
  const handleInvitation = createInvitationHandler(userId, viewingRef, setters);
  transport.onGameInvite(handleInvitation);
  transport.onGameInviteUpdate(handleInvitation);
}

/** Creates a handler that prevents processing the same invitation twice. */
function createInvitationHandler(
  userId: number,
  viewingRef: ChatViewingRef,
  setters: ChatSetters,
): (invitation: GameInvitation) => void {
  const seenInvitationIds = new Set<string>();
  return (invitation) =>
    receiveGameInvitation(
      invitation,
      userId,
      viewingRef,
      setters,
      seenInvitationIds,
    );
}

/** Opens the conversation and marks received invitations as unread. */
function receiveGameInvitation(
  invitation: GameInvitation,
  userId: number,
  viewingRef: ChatViewingRef,
  setters: ChatSetters,
  seenInvitationIds: Set<string>,
): void {
  if (isNewInvitation(invitation, seenInvitationIds)) {
    seenInvitationIds.add(invitation.inviteId);
    const conversationId = openInvitationConversation(
      invitation,
      userId,
      setters,
    );
    markInvitationUnread(
      invitation,
      userId,
      conversationId,
      viewingRef,
      setters,
    );
  }
  updateGameInvitation(setters, invitation);
}

/** Indicates whether the invitation is active and has not been seen yet. */
function isNewInvitation(
  invitation: GameInvitation,
  seenInvitationIds: Set<string>,
): boolean {
  const active = !["declined", "cancelled", "started"].includes(
    invitation.status,
  );
  return active && !seenInvitationIds.has(invitation.inviteId);
}

/** Creates the private tab corresponding to the invitation. */
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
    upsertPrivateChatTab(current, {
      conversationId,
      otherUserId,
      otherNickname,
    }),
  );
  return conversationId;
}

/** Marks the received invitation as unread when its conversation is not open. */
function markInvitationUnread(
  invitation: GameInvitation,
  userId: number,
  conversationId: string,
  viewingRef: ChatViewingRef,
  setters: ChatSetters,
): void {
  if (
    invitation.recipientId !== userId ||
    viewingRef.current === conversationId
  ) {
    return;
  }
  setters.setUnread((current) => ({
    ...current,
    [conversationId]: (current[conversationId] ?? 0) + 1,
  }));
}

/** Updates the invitation and removes result notices after a few seconds. */
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
  setters.setGameInvitations((current) =>
    upsertGameInvitation(current, invitation),
  );
  if (invitation.status === "declined" || invitation.status === "cancelled") {
    setTimeout(() => {
      setters.setGameInvitations((current) =>
        current.filter((item) => item.inviteId !== invitation.inviteId),
      );
    }, 5000);
  }
}

/** Updates an invitation received through chat or from the server. */
function upsertGameInvitation(
  current: GameInvitation[],
  invitation: GameInvitation,
): GameInvitation[] {
  return [
    ...current.filter((item) => item.inviteId !== invitation.inviteId),
    invitation,
  ];
}

/** Clears state on unmount. */
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

/** Loads the HTTP history. */
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
          friendlyError(
            failure,
            "Não foi possível carregar o chat.",
            "Falha ao carregar o chat",
          ),
        );
      }
    });
}

/** Opens the transport and returns a cleanup function. */
function openChatTransport(
  userId: number,
  transportRef: ChatTransportRef,
  viewingRef: ChatViewingRef,
  setters: ChatSetters,
): () => void {
  let cancelled = false;
  const transport = createChatTransport();
  transportRef.current = transport;
  bindTransport(transport, userId, viewingRef, setters);
  loadHistory(() => cancelled, setters);
  connectChatTransport(transport, () => cancelled, setters.setError);
  return () => {
    cancelled = true;
    transport.disconnect();
    transportRef.current = null;
  };
}

/** Connects the socket and forwards failures to the chat state. */
function connectChatTransport(
  transport: ChatTransport,
  cancelled: () => boolean,
  setError: (message: string) => void,
): void {
  void transport.connect().catch((failure: unknown) => {
    if (cancelled()) return;
    setError(
      friendlyError(
        failure,
        "Não foi possível conectar ao chat.",
        "Falha ao conectar ao chat",
      ),
    );
  });
}

/** Connects the history and socket (the same role as useFriendsConnection). */
function useChatConnection(
  userId: number | null,
  ready: boolean,
  transportRef: ChatTransportRef,
  viewingRef: ChatViewingRef,
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

/** Sending via socket. */
function transportSendActions(
  transportRef: ChatTransportRef,
): Pick<
  ChatContextValue,
  | "sendGlobalMessage"
  | "sendPrivateMessage"
  | "sendPrivateTyping"
  | "notifyPrivateRead"
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

/** Match invitation actions in the chat. */
function gameInviteActions(
  transportRef: ChatTransportRef,
): Pick<
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

/** Updates the local block after the server responds. */
function chatBlockActions(
  setters: ChatSetters,
): Pick<ChatContextValue, "blockUser" | "unblockUser"> {
  return {
    blockUser: (userId) => updateChatBlock(userId, true, setters),
    unblockUser: (userId) => updateChatBlock(userId, false, setters),
  };
}

/** Persists the block and updates the conversation state. */
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
        friendlyError(
          failure,
          blocked
            ? "Falha ao bloquear usuário."
            : "Falha ao desbloquear usuário.",
          "Falha ao atualizar bloqueio de chat",
        ),
      ),
    );
}

/** Updates the local list of blocked users. */
function updateBlockedUserIds(
  current: number[],
  userId: number,
  blocked: boolean,
): number[] {
  if (!blocked) return current.filter((blockedId) => blockedId !== userId);
  return current.includes(userId) ? current : [...current, userId];
}

/** Tabs and local read state. */
type TabViewActions = Pick<
  ChatContextValue,
  | "openPrivateTab"
  | "closePrivateTab"
  | "setViewingConversationId"
  | "markConversationRead"
>;

/** Creates the tab open, close, and read actions. */
function tabViewActions(
  viewingRef: ChatViewingRef,
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

/** Messages and private tabs. */
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

/** Unread state, typing, read state, and errors. */
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

/** State for blocks and match invitations. */
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

/** Builds setters from the state hooks. */
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

/** React state for the chat provider. */
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

/** Value exposed through the context. */
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

/** Provider for the chat history and socket. */
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
