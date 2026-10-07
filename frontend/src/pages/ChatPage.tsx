import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  type SubmitEvent,
} from "react";
import { createChatTransport, type ChatMessage, type ChatTransport } from "../api/chat";
import { ErrorText } from "../ui/ErrorText";
import { ui } from "../ui/classes";

/** Lista as mensagens recebidas no chat. */
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

/** Props do campo de digitação do chat. */
type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Campo de digitação e botão de envio. */
function Composer(props: ComposerProps) {
  return (
    <form className="flex gap-2" onSubmit={props.onSubmit}>
      <input
        className={ui.field}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="mensagem"
      />
      <button className={ui.btn} type="submit">
        Enviar
      </button>
    </form>
  );
}

/** Envia o rascunho atual pelo transporte e limpa o campo. */
function submitMessage(
  event: SubmitEvent<HTMLFormElement>,
  draft: string,
  transport: ChatTransport | null,
  clearDraft: () => void,
): void {
  event.preventDefault();
  const text = draft.trim();
  if (text === "") return;
  transport?.send(text);
  clearDraft();
}

/** Liga o transporte à página e devolve o cleanup do effect. */
function mountChat(
  onMessage: (message: ChatMessage) => void,
  onError: (message: string) => void,
  chatRef: MutableRefObject<ChatTransport | null>,
): () => void {
  const transport = createChatTransport();
  transport.onMessage(onMessage);
  void transport.connect().catch((failure: unknown) => {
    onError(failure instanceof Error ? failure.message : "falha no chat");
  });
  chatRef.current = transport;
  return () => {
    transport.disconnect();
    chatRef.current = null;
  };
}

/** Mantém a conexão do chat enquanto a sala estiver montada. */
function useChatConnection(
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
  chatRef: MutableRefObject<ChatTransport | null>,
): void {
  useEffect(() => {
    return mountChat(
      (message) => setMessages((current) => [...current, message]),
      setError,
      chatRef,
    );
  }, [setMessages, setError, chatRef]);
}

/** Props da visão da sala de chat. */
type ChatRoomViewProps = {
  messages: ChatMessage[];
  draft: string;
  error: string | null;
  onDraftChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Layout da sala: erro, lista e composer. */
function ChatRoomView(props: ChatRoomViewProps) {
  return (
    <>
      <ErrorText error={props.error} />
      <MessageList messages={props.messages} />
      <Composer
        value={props.draft}
        onChange={props.onDraftChange}
        onSubmit={props.onSubmit}
      />
    </>
  );
}

/** Sala de chat: mensagens, composer e conexão. */
function ChatRoom() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<ChatTransport | null>(null);
  useChatConnection(setMessages, setError, chatRef);
  return (
    <ChatRoomView
      messages={messages}
      draft={draft}
      error={error}
      onDraftChange={setDraft}
      onSubmit={(event) => {
        submitMessage(event, draft, chatRef.current, () => setDraft(""));
      }}
    />
  );
}

/** Página do chat global. */
export function ChatPage() {
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>Chat</h1>
      <ChatRoom />
    </main>
  );
}
