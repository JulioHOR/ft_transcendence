import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChat, type ChatContextValue } from "../app/chat-session";
import { useFriends } from "../app/friends-session";
import type { Friend } from "../api/friends";
import {
  GLOBAL_CHAT_TAB_ID,
  isAcceptedFriend,
  privateChatTabFromQuery,
  type ChatSession,
  type PrivateChatTab,
} from "./privateChat";

/** Envia o draft na aba ativa. */
function sendOnActiveTab(
  draft: string,
  activeTabId: string,
  privateChatTabs: PrivateChatTab[],
  friends: Friend[],
  chat: Pick<ChatContextValue, "sendGlobalMessage" | "sendPrivateMessage">,
): void {
  const text = draft.trim();
  if (text === "") return;
  if (activeTabId === GLOBAL_CHAT_TAB_ID) {
    chat.sendGlobalMessage(text);
    return;
  }
  const tab = privateChatTabs.find((item) => item.conversationId === activeTabId);
  if (tab == null || !isAcceptedFriend(friends, tab.otherUserId)) return;
  chat.sendPrivateMessage(tab.otherUserId, text);
}

/** Indica se a aba ativa permite envio. */
function canSendOnTab(
  activeTabId: string,
  privateChatTabs: PrivateChatTab[],
  friends: Friend[],
): boolean {
  if (activeTabId === GLOBAL_CHAT_TAB_ID) return true;
  const tab = privateChatTabs.find((item) => item.conversationId === activeTabId);
  return tab != null && isAcceptedFriend(friends, tab.otherUserId);
}

/** Abre conversa privada a partir da query, se for friend. */
function useOpenTabFromQuery(
  currentUserId: number | undefined,
  friends: Friend[],
  chat: ChatContextValue,
  setActiveTabId: (tabId: string) => void,
): void {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (currentUserId == null) return;
    const tab = privateChatTabFromQuery(
      currentUserId,
      searchParams.get("otherUserId"),
      searchParams.get("otherNickname"),
    );
    if (tab == null || !isAcceptedFriend(friends, tab.otherUserId)) return;
    chat.openPrivateTab(tab);
    setActiveTabId(tab.conversationId);
    chat.markConversationRead(tab.conversationId);
  }, [currentUserId, friends, searchParams, setActiveTabId]);
}

/** Informa ao provider qual aba está visível e marca como lida. */
function useSyncViewing(
  activeTabId: string,
  chat: ChatContextValue,
): void {
  useEffect(() => {
    chat.setViewingConversationId(activeTabId);
    if (activeTabId !== GLOBAL_CHAT_TAB_ID) {
      chat.markConversationRead(activeTabId);
    }
    return () => {
      chat.setViewingConversationId(null);
    };
  }, [activeTabId]);
}

/** Se a aba ativa sumir, volta para global. */
function useFallbackActiveTab(
  activeTabId: string,
  privateChatTabs: PrivateChatTab[],
  setActiveTabId: (tabId: string) => void,
): void {
  useEffect(() => {
    if (activeTabId === GLOBAL_CHAT_TAB_ID) return;
    const open = privateChatTabs.some(
      (tab) => tab.conversationId === activeTabId,
    );
    if (!open) setActiveTabId(GLOBAL_CHAT_TAB_ID);
  }, [activeTabId, privateChatTabs, setActiveTabId]);
}

/** Ações da página (seleção, fechar, draft). */
function pageActions(
  chat: ChatContextValue,
  friends: Friend[],
  draft: string,
  setDraft: (value: string) => void,
  activeTabId: string,
  setActiveTabId: (tabId: string) => void,
): Pick<ChatSession, "selectTab" | "closeTab" | "setDraft" | "submitDraft"> {
  return {
    selectTab: (tabId) => {
      setActiveTabId(tabId);
      if (tabId !== GLOBAL_CHAT_TAB_ID) chat.markConversationRead(tabId);
    },
    closeTab: (tabId) => {
      if (tabId === GLOBAL_CHAT_TAB_ID) return;
      chat.closePrivateTab(tabId);
      if (activeTabId === tabId) setActiveTabId(GLOBAL_CHAT_TAB_ID);
    },
    setDraft,
    submitDraft: () => {
      sendOnActiveTab(draft, activeTabId, chat.privateChatTabs, friends, chat);
      setDraft("");
    },
  };
}

/** Sessão da página de chat (draft, aba ativa e envio). */
export function useChatSession(currentUserId: number | undefined): ChatSession {
  const chat = useChat();
  const { friends } = useFriends();
  const [draft, setDraft] = useState("");
  const [activeTabId, setActiveTabId] = useState(GLOBAL_CHAT_TAB_ID);
  useOpenTabFromQuery(currentUserId, friends, chat, setActiveTabId);
  useSyncViewing(activeTabId, chat);
  useFallbackActiveTab(activeTabId, chat.privateChatTabs, setActiveTabId);
  return {
    activeTabId,
    privateChatTabs: chat.privateChatTabs,
    globalMessages: chat.globalMessages,
    privateMessagesByConversation: chat.privateMessagesByConversation,
    unreadByConversation: chat.unreadByConversation,
    draft,
    error: chat.error,
    canSendOnActiveTab: canSendOnTab(activeTabId, chat.privateChatTabs, friends),
    ...pageActions(chat, friends, draft, setDraft, activeTabId, setActiveTabId),
  };
}
