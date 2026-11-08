import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage, ChatTransport, GameInvitation } from "../api/chat";
import type { PrivateChatTab } from "../chat/privateChat";

/** Props do provedor de autenticação. */
export type AuthProviderProps = { children: ReactNode };

/** Props do provedor de chat. */
export type ChatProviderProps = { children: ReactNode };

/** Props do provedor de amigos. */
export type FriendsProviderProps = { children: ReactNode };

/** Props do guard de autenticação. */
export type RequireAuthProps = { children: ReactNode };

/** Props de um link da navegação. */
export type NavItemProps = {
  to: string;
  label: string;
  pathname: string;
  unread?: number;
  pendingFriends?: number;
};

/** Estado necessário para exibir a navegação principal. */
export type NavigationProps = {
  unread: number;
  pendingFriends: number;
  pathname: string;
  mode: "dark" | "light";
  toggleMode: () => void;
  signedIn: boolean;
  signOut: () => void;
};

/** Props do seletor compacto de navegação. */
export type MobileNavigationProps = NavigationProps;

/** Props usadas pelos links horizontais da navegação. */
export type NavItemsProps = Pick<
  NavigationProps,
  "unread" | "pendingFriends" | "pathname" | "signedIn"
>;

/** Props usadas para montar as opções do seletor compacto. */
export type MobilePageOptionsProps = Pick<
  NavigationProps,
  "unread" | "pendingFriends" | "mode" | "signedIn"
>;

/** Estado de contagem de um item de navegação. */
export type NavItemUnreadProps = Pick<
  NavigationProps,
  "unread" | "pendingFriends"
>;

/** Referência mutável do transporte de chat. */
export type ChatTransportRef = { current: ChatTransport | null };

/** Referência da conversa visualizada. */
export type ChatViewingRef = { current: string | null };

/** Setters compartilhados pelos handlers do provedor de chat. */
export type ChatSetters = {
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

/** Estado interno usado pelo provedor de chat. */
export type ChatProviderState = {
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
  transportRef: ChatTransportRef;
  viewingRef: ChatViewingRef;
};
