import { type SubmitEvent } from "react";
import type { ChatMessage } from "../api/chat";
import { useAuth } from "../app/auth-session";
import { GLOBAL_CHAT_TAB_ID, type ChatSession } from "../chat/privateChat";
import { useChatSession } from "../chat/useChatSession";
import { ErrorText } from "../ui/ErrorText";
import { ui } from "../ui/classes";

/** Lista as mensagens da aba ativa. */
function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      {messages.map((message) => (
        <li key={message.id} className={ui.muted}>
          <strong className="text-zinc-200">{message.nickname}</strong>: {message.text}
        </li>
      ))}
    </ul>
  );
}

/** Campo de digitação e botão de envio. */
function MessageComposer(props: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="flex gap-2" onSubmit={props.onSubmit}>
      <input
        className={ui.field}
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="mensagem"
      />
      <button className={ui.btn} type="submit" disabled={props.disabled}>Enviar</button>
    </form>
  );
}

/** Rótulo da aba com contagem de não lidas, se houver. */
function tabLabel(label: string, unread: number | undefined): string {
  if (unread == null || unread <= 0) return label;
  return `${label} (${unread})`;
}

/** Botão de uma aba do chat. */
function ChatTabButton(props: {
  label: string;
  tabId: string;
  activeTabId: string;
  unread?: number;
  onSelect: (tabId: string) => void;
}) {
  const className = props.activeTabId === props.tabId ? ui.tabActive : ui.tab;
  return (
    <button type="button" className={className} onClick={() => props.onSelect(props.tabId)}>
      {tabLabel(props.label, props.unread)}
    </button>
  );
}

/** Botão × para fechar aba privada. */
function CloseTabButton(props: {
  label: string;
  tabId: string;
  onClose: (tabId: string) => void;
}) {
  return (
    <button
      type="button"
      className={ui.tabClose}
      aria-label={`Fechar chat com ${props.label}`}
      onClick={() => props.onClose(props.tabId)}
    >
      ×
    </button>
  );
}

/** Aba privada com botão de fechar. */
function PrivateTabChip(props: {
  label: string;
  tabId: string;
  activeTabId: string;
  unread?: number;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <ChatTabButton {...props} />
      <CloseTabButton
        label={props.label}
        tabId={props.tabId}
        onClose={props.onClose}
      />
    </div>
  );
}

/** Abas privadas abertas na sessão. */
function PrivateTabButtons(props: {
  activeTabId: string;
  privateChatTabs: ChatSession["privateChatTabs"];
  unreadByConversation: ChatSession["unreadByConversation"];
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}) {
  return props.privateChatTabs.map((tab) => (
    <PrivateTabChip
      key={tab.conversationId}
      label={tab.otherNickname}
      tabId={tab.conversationId}
      activeTabId={props.activeTabId}
      unread={props.unreadByConversation[tab.conversationId]}
      onSelect={props.onSelect}
      onClose={props.onClose}
    />
  ));
}

/** Barra de abas: global + conversas privadas. */
function ChatTabBar(props: {
  activeTabId: string;
  privateChatTabs: ChatSession["privateChatTabs"];
  unreadByConversation: ChatSession["unreadByConversation"];
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChatTabButton
        label="Global"
        tabId={GLOBAL_CHAT_TAB_ID}
        activeTabId={props.activeTabId}
        onSelect={props.onSelect}
      />
      <PrivateTabButtons {...props} />
    </div>
  );
}

/** Mensagens exibidas conforme a aba selecionada. */
function messagesForActiveTab(session: ChatSession): ChatMessage[] {
  if (session.activeTabId === GLOBAL_CHAT_TAB_ID) return session.globalMessages;
  return session.privateMessagesByConversation[session.activeTabId] ?? [];
}

/** Composer ligado ao submit da sessão. */
function SessionComposer({ session }: { session: ChatSession }) {
  return (
    <MessageComposer
      value={session.draft}
      disabled={!session.canSendOnActiveTab}
      onChange={session.setDraft}
      onSubmit={(event) => {
        event.preventDefault();
        session.submitDraft();
      }}
    />
  );
}

/** Aviso quando a aba privada não permite envio. */
function PrivateSendBlockedHint({ session }: { session: ChatSession }) {
  if (session.activeTabId === GLOBAL_CHAT_TAB_ID) return null;
  if (session.canSendOnActiveTab) return null;
  return (
    <p className={ui.muted} role="status">
      amizade encerrada — não é possível enviar mensagens neste chat
    </p>
  );
}

/** Corpo visual da página de chat. */
function ChatPageView(session: ChatSession) {
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>Chat</h1>
      <ChatTabBar
        activeTabId={session.activeTabId}
        privateChatTabs={session.privateChatTabs}
        unreadByConversation={session.unreadByConversation}
        onSelect={session.selectTab}
        onClose={session.closeTab}
      />
      <ErrorText error={session.error} />
      <PrivateSendBlockedHint session={session} />
      <MessageList messages={messagesForActiveTab(session)} />
      <SessionComposer session={session} />
    </main>
  );
}

/** Página de chat global e conversas privadas. */
export function ChatPage() {
  const { user } = useAuth();
  return <ChatPageView {...useChatSession(user?.id)} />;
}
