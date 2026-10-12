import { createContext, useContext } from "react";
import type { ChatMessage } from "../api/chat";
import type { PrivateChatTab } from "../chat/privateChat";

/** Valor compartilhado do chat no frontend. */
export type ChatContextValue = {
  globalMessages: ChatMessage[];
  privateMessagesByConversation: Record<string, ChatMessage[]>;
  privateChatTabs: PrivateChatTab[];
  unreadByConversation: Record<string, number>;
  /** Nickname de quem está digitando, por conversa. */
  typingByConversation: Record<string, string | null>;
  peerReadByConversation: Record<string, string>;
  unreadTotal: number;
  error: string | null;
  sendGlobalMessage: (text: string) => void;
  sendPrivateMessage: (otherUserId: number, text: string) => void;
  sendPrivateTyping: (otherUserId: number, isTyping: boolean) => void;
  notifyPrivateRead: (otherUserId: number, lastMessageId: string) => void;
  openPrivateTab: (tab: PrivateChatTab) => void;
  closePrivateTab: (conversationId: string) => void;
  setViewingConversationId: (conversationId: string | null) => void;
  markConversationRead: (conversationId: string) => void;
};

/** Contexto React do chat. */
export const ChatContext = createContext<ChatContextValue | null>(null);

/** Hook para ler o chat dentro do ChatProvider. */
export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (value == null) {
    throw new Error("useChat deve ser usado dentro do ChatProvider");
  }
  return value;
}
