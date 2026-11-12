import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage, ChatTransport, GameInvitation } from "../api/chat";
import type { PrivateChatTab } from "../chat/privateChat";

/** Props for the authentication provider. */
export type AuthProviderProps = { children: ReactNode };

/** Props for the chat provider. */
export type ChatProviderProps = { children: ReactNode };

/** Props for the friends provider. */
export type FriendsProviderProps = { children: ReactNode };

/** Props for the authentication guard. */
export type RequireAuthProps = { children: ReactNode };

/** Props for a navigation link. */
export type NavItemProps = {
  to: string;
  label: string;
  pathname: string;
  unread?: number;
  pendingFriends?: number;
};

/** State required to display the main navigation. */
export type NavigationProps = {
  unread: number;
  pendingFriends: number;
  pathname: string;
  mode: "dark" | "light";
  toggleMode: () => void;
  signedIn: boolean;
  signOut: () => void;
};

/** Props for the compact navigation selector. */
export type MobileNavigationProps = NavigationProps;

/** Props used by the horizontal navigation links. */
export type NavItemsProps = Pick<
  NavigationProps,
  "unread" | "pendingFriends" | "pathname" | "signedIn"
>;

/** Props used to build the compact selector options. */
export type MobilePageOptionsProps = Pick<
  NavigationProps,
  "unread" | "pendingFriends" | "mode" | "signedIn"
>;

/** Count state for a navigation item. */
export type NavItemUnreadProps = Pick<
  NavigationProps,
  "unread" | "pendingFriends"
>;

/** Mutable reference to the chat transport. */
export type ChatTransportRef = { current: ChatTransport | null };

/** Reference to the viewed conversation. */
export type ChatViewingRef = { current: string | null };

/** Setters shared by the chat provider handlers. */
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

/** Internal state used by the chat provider. */
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
