import { useState, type FormEvent } from "react";

type Message = {
  id: number;
  content: string;
};

async function postMessage(content: string): Promise<void> {
  await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

async function fetchMessages(): Promise<Message[]> {
  const response = await fetch("/api/messages");
  return response.json();
}

function formatMessages(messages: Message[]): string {
  return messages
    .map((message) => `${message.id}: ${message.content}`)
    .join(" | ");
}

async function sendDraft(
  draft: string,
  setDraft: (value: string) => void,
  setError: (value: string | null) => void,
): Promise<void> {
  setError(null);
  try {
    await postMessage(draft);
    setDraft("");
  } catch {
    setError("Failed to send message.");
  }
}

async function loadListing(
  setListing: (value: string) => void,
  setError: (value: string | null) => void,
): Promise<void> {
  setError(null);
  try {
    setListing(formatMessages(await fetchMessages()));
  } catch {
    setError("Failed to load messages.");
  }
}

function useMessageBoard() {
  const [draft, setDraft] = useState("");
  const [listing, setListing] = useState("");
  const [error, setError] = useState<string | null>(null);

  return {
    draft,
    listing,
    error,
    setDraft,
    handleSend: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return sendDraft(draft, setDraft, setError);
    },
    handleLoad: () => loadListing(setListing, setError),
  };
}

function SendForm({
  draft,
  setDraft,
  onSend,
}: {
  draft: string;
  setDraft: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSend}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="mensagem"
      />
      <button type="submit">Enviar</button>
    </form>
  );
}

function ListingRow({
  listing,
  onLoad,
}: {
  listing: string;
  onLoad: () => void;
}) {
  return (
    <p>
      <input value={listing} readOnly />
      <button type="button" onClick={onLoad}>
        Obter
      </button>
    </p>
  );
}

function MessageBoardView(board: ReturnType<typeof useMessageBoard>) {
  return (
    <main>
      <h1>ft_transcendence</h1>
      <SendForm
        draft={board.draft}
        setDraft={board.setDraft}
        onSend={board.handleSend}
      />
      <ListingRow listing={board.listing} onLoad={board.handleLoad} />
      {board.error !== null && <p>{board.error}</p>}
    </main>
  );
}

export function HomePage() {
  const board = useMessageBoard();
  return <MessageBoardView {...board} />;
}
