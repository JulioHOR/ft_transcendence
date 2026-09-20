import { useEffect, useState, type ReactNode } from "react";
import type { Side } from "../protocol";
import { ui } from "../../../ui/classes";

function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center sm:p-6"
    >
      <h2 className="text-xl font-medium">{title}</h2>
      {children}
    </div>
  );
}

function useCountdownSeconds(startsAt: number | null): number {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (startsAt === null) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((startsAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [startsAt]);

  return seconds;
}

export function StatusScreen({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return <Screen title={title}>{children}</Screen>;
}

export function CountdownScreen({
  you,
  startsAt,
}: {
  you: Side | null;
  startsAt: number | null;
}) {
  const seconds = useCountdownSeconds(startsAt);
  const side = you === "left" ? "esquerda" : you === "right" ? "direita" : "?";

  return (
    <Screen title="Partida encontrada">
      <p className={ui.muted}>Você joga na {side}</p>
      <p className="text-5xl font-bold tabular-nums" aria-live="polite">
        {seconds}
      </p>
    </Screen>
  );
}

export function ResultScreen({
  you,
  winner,
  score,
  rematchAccepted,
  onRequestRematch,
}: {
  you: Side | null;
  winner: Side | null;
  score: { left: number; right: number };
  rematchAccepted: { left: boolean; right: boolean };
  onRequestRematch: () => void;
}) {
  const youAccepted = you !== null && rematchAccepted[you];
  const peerAccepted =
    you !== null && rematchAccepted[you === "left" ? "right" : "left"];

  return (
    <Screen title={you !== null && winner === you ? "Vitória" : "Derrota"}>
      <p className={ui.muted}>
        {score.left} — {score.right}
      </p>
      <p className={ui.muted}>
        Você: {youAccepted ? "ok" : "…"} · Oponente: {peerAccepted ? "ok" : "…"}
      </p>
      <button
        type="button"
        onClick={onRequestRematch}
        disabled={youAccepted}
        className={ui.btnSolid}
      >
        {youAccepted ? "Aguardando…" : "Jogar de novo"}
      </button>
    </Screen>
  );
}
