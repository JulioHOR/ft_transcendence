import { useState, type Dispatch, type SubmitEvent, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";

import { logout } from "../api/auth";
import { useAuth } from "../app/auth-session";
import type { User } from "../api/types";
import { ui } from "../ui/classes";

/** Mensagem da demo REST /api/messages. */
type Message = {
  /** Identificador da mensagem. */
  id: number;
  /** Conteúdo textual da mensagem. */
  content: string;
};

/** Setter de estado para valores em texto. */
type SetString = Dispatch<SetStateAction<string>>;

/** Setter de estado para mensagem de erro opcional. */
type SetError = Dispatch<SetStateAction<string | null>>;

/** Envia uma nova mensagem para /api/messages. */
async function postMessage(content: string): Promise<void> {
  await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

/** Busca as mensagens e devolve uma listagem textual para exibição. */
async function fetchListing(): Promise<string> {
  const rows: Message[] = await (await fetch("/api/messages")).json();
  return rows.map((m) => `${m.id}: ${m.content}`).join(" | ");
}

/** Campo de formulário com label acessível (somente leitores de tela). */
function LabeledInput(
  props: { id: string; label: string } & React.ComponentProps<"input">,
) {
  const { id, label, ...inputProps } = props;
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={ui.field} {...inputProps} />
    </>
  );
}

/** Trata o envio do formulário de nova mensagem. */
async function sendMessage(
  event: SubmitEvent<HTMLFormElement>,
  draft: string,
  setDraft: SetString,
  setError: SetError,
): Promise<void> {
  event.preventDefault();
  setError(null);
  try {
    await postMessage(draft);
    setDraft("");
  } catch {
    setError("Failed to send message.");
  }
}

/** Carrega a listagem de mensagens a partir da API. */
async function loadMessages(setListing: SetString, setError: SetError): Promise<void> {
  setError(null);
  try {
    setListing(await fetchListing());
  } catch {
    setError("Failed to load messages.");
  }
}

/** Propriedades do formulário de envio de mensagem. */
type MessageFormProps = {
  /** Texto digitado da mensagem. */
  draft: string;
  /** Atualiza o texto digitado. */
  setDraft: SetString;
  /** Atualiza a mensagem de erro da board. */
  setError: SetError;
};

/** Formulário para enviar uma mensagem à demo /api/messages. */
function MessageForm({ draft, setDraft, setError }: MessageFormProps) {
  return (
    <form
      className={ui.row}
      onSubmit={(e) => void sendMessage(e, draft, setDraft, setError)}
    >
      <LabeledInput
        id="msg-draft"
        label="Mensagem"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="mensagem"
      />
      <button className={ui.btn} type="submit">
        Enviar
      </button>
    </form>
  );
}

/** Propriedades da listagem de mensagens. */
type MessageListingProps = {
  /** Listagem textual já formatada. */
  listing: string;
  /** Atualiza a listagem exibida. */
  setListing: SetString;
  /** Atualiza a mensagem de erro da board. */
  setError: SetError;
};

/** Exibe a listagem de mensagens e permite recarregá-la. */
function MessageListing({ listing, setListing, setError }: MessageListingProps) {
  return (
    <div className={ui.row}>
      <LabeledInput id="msg-list" label="Lista de mensagens" value={listing} readOnly />
      <button
        className={ui.btn}
        type="button"
        onClick={() => void loadMessages(setListing, setError)}
      >
        Obter
      </button>
    </div>
  );
}

/** Exibe o erro da board, se houver. */
function BoardError({ error }: { error: string | null }) {
  if (error === null) return null;
  return (
    <p className="text-sm text-red-400" role="alert">
      {error}
    </p>
  );
}

/** Encerra a sessão no servidor e limpa o usuário no frontend. */
async function endSession(
  setUser: (user: User | null) => void,
  navigate: ReturnType<typeof useNavigate>,
): Promise<void> {
  try {
    await logout();
  } finally {
    setUser(null);
    navigate("/login");
  }
}

/** Saudação e botão de logout do usuário autenticado. */
function HomeSessionBar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  if (user === null) {
    return <p className={ui.muted}>Não logado</p>;
  }
  return (
    <>
      <p className={ui.muted}>Olá, {user.nickname}</p>
      <button
        className={ui.btn}
        type="button"
        onClick={() => void endSession(setUser, navigate)}
      >
        Sair
      </button>
    </>
  );
}

/**
 * Página inicial após autenticação.
 * Exibe o usuário da sessão, logout e a demo de /api/messages.
 */
export function HomePage() {
  const [draft, setDraft] = useState("");
  const [listing, setListing] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>ft_transcendence</h1>
      <HomeSessionBar />
      <MessageForm draft={draft} setDraft={setDraft} setError={setError} />
      <MessageListing listing={listing} setListing={setListing} setError={setError} />
      <BoardError error={error} />
    </main>
  );
}
