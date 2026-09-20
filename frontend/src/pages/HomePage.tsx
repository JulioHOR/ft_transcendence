import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ui } from "../ui/classes";

type Message = { id: number; content: string };
type SetString = Dispatch<SetStateAction<string>>;
type SetError = Dispatch<SetStateAction<string | null>>;

async function postMessage(content: string): Promise<void> {
  await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

async function fetchListing(): Promise<string> {
  const rows: Message[] = await (await fetch("/api/messages")).json();
  return rows.map((m) => `${m.id}: ${m.content}`).join(" | ");
}

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

async function sendMessage(
  event: FormEvent,
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

async function loadMessages(setListing: SetString, setError: SetError): Promise<void> {
  setError(null);
  try {
    setListing(await fetchListing());
  } catch {
    setError("Failed to load messages.");
  }
}

type MessageFormProps = {
  draft: string;
  setDraft: SetString;
  setError: SetError;
};

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

type MessageListingProps = {
  listing: string;
  setListing: SetString;
  setError: SetError;
};

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

function BoardError({ error }: { error: string | null }) {
  if (error === null) return null;
  return (
    <p className="text-sm text-red-400" role="alert">
      {error}
    </p>
  );
}

export function HomePage() {
  const [draft, setDraft] = useState("");
  const [listing, setListing] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>ft_transcendence</h1>
      <MessageForm draft={draft} setDraft={setDraft} setError={setError} />
      <MessageListing listing={listing} setListing={setListing} setError={setError} />
      <BoardError error={error} />
    </main>
  );
}
