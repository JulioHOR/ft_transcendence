import type { ReactNode } from "react";
import type { ChatMessage } from "../api/chat";
import type { Friend } from "../api/friends";
import type { ChatSession } from "../chat/privateChat";

/** Recibo da última mensagem própria. */
export type MessageReceiptInfo = {
  messageId: string;
  kind: "entregue" | "visualizado";
};

/** Props do indicador de recibo de mensagem. */
export type MessageReceiptProps = { kind: MessageReceiptInfo["kind"] };

/** Props do conteúdo de uma mensagem. */
export type MessageContentProps = {
  message: ChatMessage;
  receipt: MessageReceiptInfo["kind"] | null;
};

/** Props de uma linha de mensagem. */
export type MessageItemProps = MessageContentProps & {
  avatarUrl: string | null;
};

/** Props da lista de mensagens. */
export type MessageListItemsProps = {
  messages: ChatMessage[];
  currentUserId: number | undefined;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  receipt: MessageReceiptInfo | null;
};

/** Props do indicador de digitação. */
export type TypingFooterProps = { nickname: string | null };

/** Props compartilhadas pela lista e sua área rolável. */
export type MessageRowsProps = {
  messages: ChatMessage[];
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  receipt: MessageReceiptInfo | null;
};

/** Props da moldura visual da lista de mensagens. */
export type MessageListFrameProps = {
  children: ReactNode;
  nickname: string | null;
};

/** Props do painel de mensagens. */
export type MessageListPanelProps = {
  session: ChatSession;
  messages: ChatMessage[];
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
};

/** Props da lista de mensagens da aba ativa. */
export type MessageListProps = {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
};

/** Props visuais e ações compartilhadas pelas abas do chat. */
export type ChatTabProps = {
  label: ReactNode;
  ariaLabel: string;
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
};

/** Props de componentes que exibem uma sessão de chat. */
export type ChatSessionProps = { session: ChatSession };

/** Props do contador de caracteres. */
export type MessageLengthCounterProps = { value: number };

/** Props do conteúdo do composer. */
export type ChatComposerProps = ChatSessionProps;

/** Props do aviso de acesso à conversa privada. */
export type PrivateMessageAccessNoticeProps = ChatSessionProps;

/** Props das ações da conversa privada. */
export type PrivateChatActionsProps = {
  session: ChatSession;
  friends: Friend[];
};

/** Props do convite para jogar. */
export type GameInviteButtonProps = {
  session: ChatSession;
  userId: number;
  disabled: boolean;
};

/** Props da ação de bloquear um contato. */
export type ChatBlockButtonProps = {
  session: ChatSession;
  userId: number;
};

/** Props dos avisos de convite da conversa ativa. */
export type GameInvitationNoticesProps = ChatSessionProps;

/** Props de um aviso de convite. */
export type GameInvitationNoticeProps = {
  invitation: ChatSession["gameInvitations"][number];
  session: ChatSession;
};

/** Props visuais de um alerta de convite. */
export type GameInvitationAlertProps = {
  accepted: boolean;
  action?: ReactNode;
  message: string;
};

/** Props das ações de um convite. */
export type GameInvitationActionsProps = GameInvitationNoticeProps & {
  accepted: boolean;
  sentByCurrentUser: boolean;
};

/** Props da página de chat. */
export type ChatContentProps = {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
};
