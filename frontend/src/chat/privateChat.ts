import {
  buildPrivateConversationId,
  type ChatHistory,
  type ChatMessage,
} from "../api/chat";
import type { Friend } from "../api/friends";

/** Identificador da aba do chat global. */
export const GLOBAL_CHAT_TAB_ID = "global";

/** Aba de conversa privada. */
export type PrivateChatTab = {
  otherUserId: number;
  otherNickname: string;
  conversationId: string;
};

/** Estado e ações da página de chat. */
export type ChatSession = {
  activeTabId: string;
  privateChatTabs: PrivateChatTab[];
  globalMessages: ChatMessage[];
  privateMessagesByConversation: Record<string, ChatMessage[]>;
  unreadByConversation: Record<string, number>;
  draft: string;
  error: string | null;
  canSendOnActiveTab: boolean;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  setDraft: (value: string) => void;
  submitDraft: () => void;
};

/** Monta o path /chat com query da conversa privada. */
export function buildPrivateChatPath(
  otherUserId: number,
  otherNickname: string,
): string {
  const params = new URLSearchParams({
    otherUserId: String(otherUserId),
    otherNickname,
  });
  return `/chat?${params.toString()}`;
}

/** Indica se o userId é friend aceito. */
export function isAcceptedFriend(friends: Friend[], userId: number): boolean {
  return friends.some(
    (friend) => friend.id === userId && friend.relation === "friend",
  );
}

/** Monta a aba privada a partir da query da URL. */
export function privateChatTabFromQuery(
  currentUserId: number,
  otherUserIdRaw: string | null,
  otherNickname: string | null,
): PrivateChatTab | null {
  const otherUserId = Number(otherUserIdRaw);
  if (!Number.isFinite(otherUserId) || !otherNickname) return null;
  return {
    otherUserId,
    otherNickname,
    conversationId: buildPrivateConversationId(currentUserId, otherUserId),
  };
}

/** Inclui a aba na lista se ainda não existir. */
export function upsertPrivateChatTab(
  current: PrivateChatTab[],
  tab: PrivateChatTab,
): PrivateChatTab[] {
  if (current.some((item) => item.conversationId === tab.conversationId)) {
    return current;
  }
  return [...current, tab];
}

/** Converte o histórico HTTP em mensagens e abas. */
export function historyToClientState(history: ChatHistory): {
  privateMessagesByConversation: Record<string, ChatMessage[]>;
  privateChatTabs: PrivateChatTab[];
} {
  const privateMessagesByConversation: Record<string, ChatMessage[]> = {};
  const privateChatTabs: PrivateChatTab[] = [];
  for (const conversation of history.conversations) {
    privateMessagesByConversation[conversation.conversationId] =
      conversation.messages;
    privateChatTabs.push({
      conversationId: conversation.conversationId,
      otherUserId: conversation.otherUserId,
      otherNickname: conversation.otherNickname,
    });
  }
  return { privateMessagesByConversation, privateChatTabs };
}

/** Acrescenta uma mensagem privada no registro. */
export function appendPrivateMessage(
  current: Record<string, ChatMessage[]>,
  message: ChatMessage,
): Record<string, ChatMessage[]> {
  const conversationId = message.conversationId;
  if (conversationId == null) return current;
  return {
    ...current,
    [conversationId]: [...(current[conversationId] ?? []), message],
  };
}
