import { type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import type { ChatMessage } from "../api/chat";
import type { Friend } from "../api/friends";
import { liveAvatarUrl } from "../api/profile";
import { useAuth } from "../app/auth-session";
import { useFriends } from "../app/friends-session";
import { GLOBAL_CHAT_TAB_ID, type ChatSession } from "../chat/privateChat";
import { useChatSession } from "../chat/useChatSession";
import { Avatar } from "../ui/Avatar";
import { ErrorText } from "../ui/ErrorText";
import { ui } from "../ui/classes";

type MessageReceiptInfo = {
  messageId: string;
  kind: "entregue" | "visualizado";
};

/** Recibo da última mensagem própria (entregue / visualizado). */
function lastOwnReceipt(
  messages: ChatMessage[],
  currentUserId: number | undefined,
  peerLastReadMessageId: string | null,
): MessageReceiptInfo | null {
  if (currentUserId == null) return null;
  const lastOwn = messages.findLast((message) => message.userId === currentUserId);
  if (lastOwn == null) return null;
  if (peerLastReadMessageId == null) {
    return { messageId: lastOwn.id, kind: "entregue" };
  }
  const readIndex = messages.findIndex((m) => m.id === peerLastReadMessageId);
  const ownIndex = messages.findIndex((m) => m.id === lastOwn.id);
  const seen = readIndex >= 0 && ownIndex >= 0 && ownIndex <= readIndex;
  return { messageId: lastOwn.id, kind: seen ? "visualizado" : "entregue" };
}

/** Avatar atual do autor (sessão / friends, com fallback da mensagem). */
function messageAvatarUrl(
  message: ChatMessage,
  selfId: number | undefined,
  selfAvatarUrl: string | null | undefined,
  friends: Friend[],
): string | null {
  return liveAvatarUrl(message.userId, {
    selfId,
    selfAvatarUrl,
    friends,
    fallback: message.avatarUrl,
  });
}

/** Ícone de recibo: ✓ entregue, ✓✓ visualizado. */
function MessageReceipt(props: { kind: "entregue" | "visualizado" }) {
  const className =
    props.kind === "visualizado" ? ui.receiptSeen : ui.receiptDelivered;
  const marks = props.kind === "visualizado" ? "✓✓" : "✓";
  return (
    <span className={className} aria-label={props.kind}>
      {marks}
    </span>
  );
}

/** Uma mensagem: avatar, nome, texto e recibo opcional. */
function MessageItem(props: {
  message: ChatMessage;
  avatarUrl: string | null;
  receipt: "entregue" | "visualizado" | null;
}) {
  return (
    <li className={ui.messageRow}>
      <Avatar
        userId={props.message.userId}
        avatarUrl={props.avatarUrl}
        alt={props.message.nickname}
        size="sm"
      />
      <p className={ui.muted}>
        <Link className={ui.nameLink} to={`/profile/${props.message.userId}`}>
          {props.message.nickname}
        </Link>
        : {props.message.text}
        {props.receipt ? <MessageReceipt kind={props.receipt} /> : null}
      </p>
    </li>
  );
}

/** Itens da lista de mensagens. */
function MessageListItems(props: {
  messages: ChatMessage[];
  currentUserId: number | undefined;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  receipt: MessageReceiptInfo | null;
}) {
  return props.messages.map((message) => (
    <MessageItem
      key={message.id}
      message={message}
      avatarUrl={messageAvatarUrl(
        message,
        props.currentUserId,
        props.selfAvatarUrl,
        props.friends,
      )}
      receipt={
        props.receipt != null && props.receipt.messageId === message.id
          ? props.receipt.kind
          : null
      }
    />
  ));
}

/** Rodapé do quadro: alguém está digitando. */
function TypingFooter({ nickname }: { nickname: string | null }) {
  if (nickname == null) return null;
  return (
    <p className={ui.messageFooter} role="status">
      {nickname} está digitando…
    </p>
  );
}

/** Recibo da aba privada, ou null no global. */
function privateTabReceipt(
  session: ChatSession,
  messages: ChatMessage[],
  isPrivate: boolean,
): MessageReceiptInfo | null {
  if (!isPrivate) return null;
  return lastOwnReceipt(
    messages,
    session.currentUserId,
    session.peerLastReadMessageId,
  );
}

/** Quadro de mensagens com “digitando…” no rodapé. */
function MessageList(props: {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
}) {
  const messages = activeTabMessages(props.session);
  return (
    <div className={ui.messagePanel}>
      <ul className={ui.messageList}>
        <MessageListItems
          messages={messages}
          currentUserId={props.session.currentUserId}
          selfAvatarUrl={props.selfAvatarUrl}
          friends={props.friends}
          receipt={privateTabReceipt(props.session, messages, props.isPrivate)}
        />
      </ul>
      <TypingFooter
        nickname={props.isPrivate ? props.session.typingNickname : null}
      />
    </div>
  );
}

/** Rótulo da aba privada com contagem de não lidas. */
function privateTabLabel(
  tab: ChatSession["privateChatTabs"][number],
  unreadByConversation: ChatSession["unreadByConversation"],
): string {
  const unread = unreadByConversation[tab.conversationId];
  if (unread != null && unread > 0) return `${tab.otherNickname} (${unread})`;
  return tab.otherNickname;
}

/** Botão × para fechar aba privada. */
function TabCloseButton(props: { label: string; onClose: () => void }) {
  return (
    <button
      type="button"
      className={ui.tabClose}
      aria-label={`Fechar chat com ${props.label}`}
      onClick={props.onClose}
    >
      ×
    </button>
  );
}

/** Aba privada com botão de fechar. */
function PrivateTabChip(props: {
  label: string;
  tabId: string;
  active: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}) {
  return (
    <div className={ui.inlineCenter}>
      <button
        type="button"
        className={props.active ? ui.tabActive : ui.tab}
        onClick={() => props.onSelect(props.tabId)}
      >
        {props.label}
      </button>
      <TabCloseButton
        label={props.label}
        onClose={() => props.onClose(props.tabId)}
      />
    </div>
  );
}

/** Barra de abas: Global + conversas privadas abertas. */
function ChatTabBar({ session }: { session: ChatSession }) {
  return (
    <div className={ui.wrap}>
      <button
        type="button"
        className={
          session.activeTabId === GLOBAL_CHAT_TAB_ID ? ui.tabActive : ui.tab
        }
        onClick={() => session.selectTab(GLOBAL_CHAT_TAB_ID)}
      >
        Global
      </button>
      {session.privateChatTabs.map((tab) => (
        <PrivateTabChip
          key={tab.conversationId}
          label={privateTabLabel(tab, session.unreadByConversation)}
          tabId={tab.conversationId}
          active={session.activeTabId === tab.conversationId}
          onSelect={session.selectTab}
          onClose={session.closeTab}
        />
      ))}
    </div>
  );
}

/** Campo de texto do composer. */
function ChatDraftInput({ session }: { session: ChatSession }) {
  return (
    <input
      id="chat-draft"
      className={ui.field}
      value={session.draft}
      disabled={!session.canSendOnActiveTab}
      onChange={(event) => session.setDraft(event.target.value)}
      placeholder="mensagem"
      aria-label="Mensagem"
    />
  );
}

/** Formulário de envio na aba ativa. */
function ChatComposer({ session }: { session: ChatSession }) {
  function onSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    session.submitDraft();
  }
  return (
    <form className={ui.inline} onSubmit={onSubmit}>
      <ChatDraftInput session={session} />
      <button
        className={ui.btn}
        type="submit"
        disabled={!session.canSendOnActiveTab}
      >
        Enviar
      </button>
    </form>
  );
}

/** Mensagens da aba ativa (global ou conversa privada). */
function activeTabMessages(session: ChatSession): ChatMessage[] {
  if (session.activeTabId === GLOBAL_CHAT_TAB_ID) return session.globalMessages;
  return session.privateMessagesByConversation[session.activeTabId] ?? [];
}

/** Aviso quando a amizade encerrou e o envio está bloqueado. */
function EndedFriendshipNotice(props: { show: boolean }) {
  if (!props.show) return null;
  return (
    <p className={ui.muted} role="status">
      amizade encerrada — não é possível enviar mensagens neste chat
    </p>
  );
}

/** Conteúdo da página (abas, lista, composer). */
function ChatContent(props: {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
}) {
  const { session } = props;
  const isPrivate = session.activeTabId !== GLOBAL_CHAT_TAB_ID;
  return (
    <div className={ui.content}>
      <ChatTabBar session={session} />
      <ErrorText error={session.error} />
      <EndedFriendshipNotice show={isPrivate && !session.canSendOnActiveTab} />
      <MessageList
        session={session}
        selfAvatarUrl={props.selfAvatarUrl}
        friends={props.friends}
        isPrivate={isPrivate}
      />
      <ChatComposer session={session} />
    </div>
  );
}

/** Página de chat global e conversas privadas. */
export function ChatPage() {
  const { user } = useAuth();
  const { friends } = useFriends();
  return (
    <main className={ui.pageShell}>
      <h1 className={ui.title}>Chat</h1>
      <ChatContent
        session={useChatSession(user?.id)}
        selfAvatarUrl={user?.avatarUrl}
        friends={friends}
      />
    </main>
  );
}
