import type { ReactNode } from "react";
import type { ChatMessage } from "../api/chat";
import type { Friend } from "../api/friends";
import type { ChatSession } from "../chat/privateChat";

/** Receipt for the most recent message sent by the current user. */
export type MessageReceiptInfo = {
  messageId: string;
  kind: "entregue" | "visualizado";
};

/** Props for the message receipt indicator. */
export type MessageReceiptProps = { kind: MessageReceiptInfo["kind"] };

/** Props for a message's content. */
export type MessageContentProps = {
  message: ChatMessage;
  receipt: MessageReceiptInfo["kind"] | null;
};

/** Props for a message row. */
export type MessageItemProps = MessageContentProps & {
  avatarUrl: string | null;
};

/** Props for the message list. */
export type MessageListItemsProps = {
  messages: ChatMessage[];
  currentUserId: number | undefined;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  receipt: MessageReceiptInfo | null;
};

/** Props for the typing indicator. */
export type TypingFooterProps = { nickname: string | null };

/** Props shared by the list and its scrollable area. */
export type MessageRowsProps = {
  messages: ChatMessage[];
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  receipt: MessageReceiptInfo | null;
};

/** Props for the visual frame of the message list. */
export type MessageListFrameProps = {
  children: ReactNode;
  nickname: string | null;
};

/** Props for the message panel. */
export type MessageListPanelProps = {
  session: ChatSession;
  messages: ChatMessage[];
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
};

/** Props for the active tab's message list. */
export type MessageListProps = {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
};

/** Visual props and actions shared by the chat tabs. */
export type ChatTabProps = {
  label: ReactNode;
  ariaLabel: string;
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
};

/** Props for components that display a chat session. */
export type ChatSessionProps = { session: ChatSession };

/** Props for the character counter. */
export type MessageLengthCounterProps = { value: number };

/** Props for the composer content. */
export type ChatComposerProps = ChatSessionProps;

/** Props for the private conversation access notice. */
export type PrivateMessageAccessNoticeProps = ChatSessionProps;

/** Props for the private conversation actions. */
export type PrivateChatActionsProps = {
  session: ChatSession;
  friends: Friend[];
};

/** Props for the play invitation. */
export type GameInviteButtonProps = {
  session: ChatSession;
  userId: number;
  disabled: boolean;
};

/** Props for the contact blocking action. */
export type ChatBlockButtonProps = {
  session: ChatSession;
  userId: number;
};

/** Props for invitation notices in the active conversation. */
export type GameInvitationNoticesProps = ChatSessionProps;

/** Props for an invitation notice. */
export type GameInvitationNoticeProps = {
  invitation: ChatSession["gameInvitations"][number];
  session: ChatSession;
};

/** Visual props for an invitation alert. */
export type GameInvitationAlertProps = {
  accepted: boolean;
  action?: ReactNode;
  message: string;
};

/** Props for invitation actions. */
export type GameInvitationActionsProps = GameInvitationNoticeProps & {
  accepted: boolean;
  sentByCurrentUser: boolean;
};

/** Props for the chat page. */
export type ChatContentProps = {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
};
