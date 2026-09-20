import { useState, type FormEvent } from "react";
import { ui } from "../ui/classes";

type Message = { id: number; content: string };

export function HomePage() {
  const [draft, setDraft] = useState("");
  const [listing, setListing] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      setDraft("");
    } catch {
      setError("Failed to send message.");
    }
  }

  async function load() {
    setError(null);
    try {
      const rows: Message[] = await (await fetch("/api/messages")).json();
      setListing(rows.map((m) => `${m.id}: ${m.content}`).join(" | "));
    } catch {
      setError("Failed to load messages.");
    }
  }

  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>ft_transcendence</h1>

      <form className={ui.row} onSubmit={send}>
        <label className="sr-only" htmlFor="msg-draft">
          Mensagem
        </label>
        <input
          id="msg-draft"
          className={ui.field}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="mensagem"
        />
        <button className={ui.btn} type="submit">
          Enviar
        </button>
      </form>

      <div className={ui.row}>
        <label className="sr-only" htmlFor="msg-list">
          Lista de mensagens
        </label>
        <input id="msg-list" className={ui.field} value={listing} readOnly />
        <button className={ui.btn} type="button" onClick={load}>
          Obter
        </button>
      </div>

      {error !== null && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
