import {
  buildPrivateConversationId,
  type ChatHistory,
  type ChatMessage,
  type GameInvitation,
} from "../api/chat";
import type { Friend } from "../api/friends";

/** Identifier for the global chat tab. */
export const GLOBAL_CHAT_TAB_ID = "global";

/** Private conversation tab. */
export type PrivateChatTab = {
  otherUserId: number;
  otherNickname: string;
  conversationId: string;
};

/** Chat page state and actions. */
export type ChatSession = {
  activeTabId: string;
  privateChatTabs: PrivateChatTab[];
  globalMessages: ChatMessage[];
  privateMessagesByConversation: Record<string, ChatMessage[]>;
  unreadByConversation: Record<string, number>;
  typingNickname: string | null;
  peerLastReadMessageId: string | null;
  currentUserId: number | undefined;
  draft: string;
  error: string | null;
  canSendOnActiveTab: boolean;
  blockedByCurrentUser: boolean;
  blockedByOtherUser: boolean;
  gameInvitations: GameInvitation[];
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  setDraft: (value: string) => void;
  submitDraft: () => void;
  sendGameInvite: (otherUserId: number) => void;
  respondGameInvite: (inviteId: string, accepted: boolean) => void;
  cancelGameInvite: (inviteId: string) => void;
  clearError: () => void;
  blockUser: (userId: number) => void;
  unblockUser: (userId: number) => void;
};

/** Builds the /chat path with the private conversation query. */
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

/** Indicates whether the userId belongs to an accepted friend. */
export function isAcceptedFriend(friends: Friend[], userId: number): boolean {
  return friends.some(
    (friend) => friend.id === userId && friend.relation === "friend",
  );
}

/** Builds the private tab from the URL query. */
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

/** Adds the tab to the list if it does not already exist. */
export function upsertPrivateChatTab(
  current: PrivateChatTab[],
  tab: PrivateChatTab,
): PrivateChatTab[] {
  if (current.some((item) => item.conversationId === tab.conversationId)) {
    return current;
  }
  return [...current, tab];
}

/** Converts the HTTP history into messages and tabs. */
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

/** Appends a private message to the record. */
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
