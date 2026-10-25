import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChat } from "../app/chat-session";
import { useFriends } from "../app/friends-session";
import { useLatestRef } from "../app/useLatestRef";
import type { Friend } from "../api/friends";
import {
  GLOBAL_CHAT_TAB_ID,
  isAcceptedFriend,
  privateChatTabFromQuery,
  type ChatSession,
  type PrivateChatTab,
} from "./privateChat";

type ChatApi = ReturnType<typeof useChat>;

/** Aba privada ativa, se houver. */
function findPrivateTab(
  activeTabId: string,
  tabs: PrivateChatTab[],
): PrivateChatTab | null {
  if (activeTabId === GLOBAL_CHAT_TAB_ID) return null;
  return tabs.find((tab) => tab.conversationId === activeTabId) ?? null;
}

/** Marca lido e notifica o outro usuário. */
function markPrivateRead(activeTabId: string, chat: ChatApi): void {
  if (activeTabId === GLOBAL_CHAT_TAB_ID) return;
  chat.markConversationRead(activeTabId);
  const tab = findPrivateTab(activeTabId, chat.privateChatTabs);
  const messages = chat.privateMessagesByConversation[activeTabId] ?? [];
  const last = messages[messages.length - 1];
  if (tab == null || last == null) return;
  chat.notifyPrivateRead(tab.otherUserId, last.id);
}

/** Emite typing na aba privada ativa. */
function emitTyping(
  activeTabId: string,
  tabs: PrivateChatTab[],
  friends: Friend[],
  chat: ChatApi,
  isTyping: boolean,
): void {
  const tab = findPrivateTab(activeTabId, tabs);
  if (tab == null || !isAcceptedFriend(friends, tab.otherUserId)) return;
  chat.sendPrivateTyping(tab.otherUserId, isTyping);
}

/** Abre aba a partir da query. */
function useOpenTabFromQuery(
  currentUserId: number | undefined,
  friends: Friend[],
  chat: ChatApi,
  setActiveTabId: (tabId: string) => void,
): void {
  const [searchParams] = useSearchParams();
  const chatRef = useLatestRef(chat);
  useEffect(() => {
    if (currentUserId == null) return;
    const tab = privateChatTabFromQuery(
      currentUserId,
      searchParams.get("otherUserId"),
      searchParams.get("otherNickname"),
    );
    if (tab == null || !isAcceptedFriend(friends, tab.otherUserId)) return;
    chatRef.current.openPrivateTab(tab);
    setActiveTabId(tab.conversationId);
    markPrivateRead(tab.conversationId, chatRef.current);
  }, [currentUserId, friends, searchParams, setActiveTabId, chatRef]);
}

/** Sincroniza aba visível / leitura. */
function useSyncViewing(activeTabId: string, chat: ChatApi): void {
  const count = chat.privateMessagesByConversation[activeTabId]?.length ?? 0;
  const chatRef = useLatestRef(chat);
  useEffect(() => {
    const api = chatRef.current;
    api.setViewingConversationId(activeTabId);
    markPrivateRead(activeTabId, api);
    return () => api.setViewingConversationId(null);
  }, [activeTabId, count, chatRef]);
}

/** Volta ao global se a aba privada foi fechada. */
function useActiveTabFallback(
  activeTabId: string,
  tabs: PrivateChatTab[],
  setActiveTabId: (tabId: string) => void,
): void {
  useEffect(() => {
    if (activeTabId === GLOBAL_CHAT_TAB_ID) return;
    if (!tabs.some((tab) => tab.conversationId === activeTabId)) {
      setActiveTabId(GLOBAL_CHAT_TAB_ID);
    }
  }, [activeTabId, tabs, setActiveTabId]);
}

/** Pode enviar na aba ativa. */
function canSendOnTab(
  activeTabId: string,
  privateTab: PrivateChatTab | null,
  friends: Friend[],
  blockedUserIds: number[],
  blockingUserIds: number[],
): boolean {
  if (activeTabId === GLOBAL_CHAT_TAB_ID) return true;
  return (
    privateTab != null &&
    isAcceptedFriend(friends, privateTab.otherUserId) &&
    !blockedUserIds.includes(privateTab.otherUserId) &&
    !blockingUserIds.includes(privateTab.otherUserId)
  );
}

/** Draft com typing debounce. */
function setDraftWithTyping(
  value: string,
  activeTabId: string,
  chat: ChatApi,
  friends: Friend[],
  setDraft: (value: string) => void,
  timerRef: { current: ReturnType<typeof setTimeout> | null },
): void {
  setDraft(value);
  if (timerRef.current != null) clearTimeout(timerRef.current);
  if (value.trim() === "") {
    emitTyping(activeTabId, chat.privateChatTabs, friends, chat, false);
    return;
  }
  emitTyping(activeTabId, chat.privateChatTabs, friends, chat, true);
  timerRef.current = setTimeout(() => {
    emitTyping(activeTabId, chat.privateChatTabs, friends, chat, false);
    timerRef.current = null;
  }, 1200);
}

/** Envia draft da aba ativa. */
function submitDraft(
  draft: string,
  activeTabId: string,
  tab: PrivateChatTab | null,
  canSend: boolean,
  chat: ChatApi,
  friends: Friend[],
  setDraft: (value: string) => void,
  timerRef: { current: ReturnType<typeof setTimeout> | null },
): void {
  const text = draft.trim();
  if (timerRef.current != null) clearTimeout(timerRef.current);
  emitTyping(activeTabId, chat.privateChatTabs, friends, chat, false);
  setDraft("");
  if (text === "") return;
  if (activeTabId === GLOBAL_CHAT_TAB_ID) {
    chat.sendGlobalMessage(text);
    return;
  }
  if (tab == null || !canSend) return;
  chat.sendPrivateMessage(tab.otherUserId, text);
}

type SessionHandlersArgs = {
  activeTabId: string;
  chat: ChatApi;
  friends: Friend[];
  draft: string;
  setDraft: (value: string) => void;
  setActiveTabId: (tabId: string) => void;
  timerRef: { current: ReturnType<typeof setTimeout> | null };
  privateTab: PrivateChatTab | null;
  canSend: boolean;
};

/** Selecionar e fechar abas. */
function tabSessionActions(
  activeTabId: string,
  chat: ChatApi,
  setActiveTabId: (tabId: string) => void,
): Pick<ChatSession, "selectTab" | "closeTab"> {
  return {
    selectTab: (tabId) => {
      setActiveTabId(tabId);
      markPrivateRead(tabId, chat);
    },
    closeTab: (tabId) => {
      if (tabId === GLOBAL_CHAT_TAB_ID) return;
      chat.closePrivateTab(tabId);
      if (activeTabId === tabId) setActiveTabId(GLOBAL_CHAT_TAB_ID);
    },
  };
}

/** Draft e envio com typing debounce. */
function draftSessionActions(
  args: SessionHandlersArgs,
): Pick<ChatSession, "setDraft" | "submitDraft"> {
  const { activeTabId, chat, friends, draft, setDraft, timerRef } = args;
  return {
    setDraft: (value) =>
      setDraftWithTyping(value, activeTabId, chat, friends, setDraft, timerRef),
    submitDraft: () =>
      submitDraft(
        draft,
        activeTabId,
        args.privateTab,
        args.canSend,
        chat,
        friends,
        setDraft,
        timerRef,
      ),
  };
}

/** Campos derivados da sessão (sem handlers). */
function chatSessionSnapshot(
  activeTabId: string,
  chat: ChatApi,
  currentUserId: number | undefined,
  draft: string,
  canSend: boolean,
): Omit<ChatSession, "selectTab" | "closeTab" | "setDraft" | "submitDraft"> {
  const privateTab = findPrivateTab(activeTabId, chat.privateChatTabs);
  return {
    activeTabId,
    privateChatTabs: chat.privateChatTabs,
    globalMessages: chat.globalMessages,
    privateMessagesByConversation: chat.privateMessagesByConversation,
    unreadByConversation: chat.unreadByConversation,
    typingNickname: chat.typingByConversation[activeTabId] ?? null,
    peerLastReadMessageId: chat.peerReadByConversation[activeTabId] ?? null,
    currentUserId,
    draft,
    error: chat.error,
    canSendOnActiveTab: canSend,
    ...chatActionsSnapshot(chat, privateTab),
  };
}

/** Ações e bloqueios associados à conversa privada ativa. */
function chatActionsSnapshot(
  chat: ChatApi,
  privateTab: PrivateChatTab | null,
): Pick<
  ChatSession,
  | "blockedByCurrentUser"
  | "blockedByOtherUser"
  | "gameInvitations"
  | "sendGameInvite"
  | "respondGameInvite"
  | "cancelGameInvite"
  | "clearError"
  | "blockUser"
  | "unblockUser"
> {
  return { ...chatRestrictionSnapshot(chat, privateTab), ...chatInvitationActions(chat) };
}

/** Estado de bloqueio da conversa ativa. */
function chatRestrictionSnapshot(chat: ChatApi, privateTab: PrivateChatTab | null) {
  return {
    blockedByCurrentUser: isUserBlocked(chat.blockedUserIds, privateTab),
    blockedByOtherUser: isUserBlocked(chat.blockingUserIds, privateTab),
  };
}

/** Convites e ações disponíveis no chat. */
function chatInvitationActions(chat: ChatApi) {
  return {
    gameInvitations: chat.gameInvitations,
    sendGameInvite: chat.sendGameInvite,
    respondGameInvite: chat.respondGameInvite,
    cancelGameInvite: chat.cancelGameInvite,
    clearError: chat.clearError,
    blockUser: chat.blockUser,
    unblockUser: chat.unblockUser,
  };
}

/** Estado local de aba e draft da página. */
function useChatTabState(
  currentUserId: number | undefined,
  chat: ChatApi,
  friends: Friend[],
) {
  const tabState = useChatTabData(currentUserId, chat, friends);
  const permissions = chatTabPermissions(
    tabState.activeTabId,
    chat.privateChatTabs,
    friends,
    chat.blockedUserIds,
    chat.blockingUserIds,
  );
  return { ...tabState, ...permissions };
}

/** Guarda a aba, o rascunho e o temporizador do chat. */
function useChatTabData(
  currentUserId: number | undefined,
  chat: ChatApi,
  friends: Friend[],
) {
  const [draft, setDraft] = useState("");
  const [activeTabId, setActiveTabId] = useState(GLOBAL_CHAT_TAB_ID);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useOpenTabFromQuery(currentUserId, friends, chat, setActiveTabId);
  useSyncViewing(activeTabId, chat);
  useActiveTabFallback(activeTabId, chat.privateChatTabs, setActiveTabId);
  return {
    draft,
    setDraft,
    activeTabId,
    setActiveTabId,
    timerRef,
  };
}

/** Verifica se a conversa ativa inclui um usuário da lista. */
function isUserBlocked(userIds: number[], privateTab: PrivateChatTab | null) {
  return privateTab != null && userIds.includes(privateTab.otherUserId);
}

/** Resolve o contato ativo e as permissões de envio. */
function chatTabPermissions(
  activeTabId: string,
  tabs: PrivateChatTab[],
  friends: Friend[],
  blockedUserIds: number[],
  blockingUserIds: number[],
): { privateTab: PrivateChatTab | null; canSend: boolean } {
  const privateTab = findPrivateTab(activeTabId, tabs);
  return {
    privateTab,
    canSend: canSendOnTab(
      activeTabId,
      privateTab,
      friends,
      blockedUserIds,
      blockingUserIds,
    ),
  };
}

/** Sessão da página de chat. */
export function useChatSession(currentUserId: number | undefined): ChatSession {
  const chat = useChat();
  const { friends } = useFriends();
  const tab = useChatTabState(currentUserId, chat, friends);
  return {
    ...chatSessionSnapshot(
      tab.activeTabId,
      chat,
      currentUserId,
      tab.draft,
      tab.canSend,
    ),
    ...tabSessionActions(tab.activeTabId, chat, tab.setActiveTabId),
    ...draftSessionActions({ ...tab, chat, friends }),
  };
}
