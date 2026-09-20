import { useEffect, useState, type ReactNode } from "react";
import type { MatchState, Side } from "../protocol";
import { ui } from "../../../ui/classes";

export function StatusScreen({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
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

function sideLabel(side: Side | null): string {
  if (side === "left") return "esquerda";
  if (side === "right") return "direita";
  return "?";
}

export function CountdownScreen({
  playerSide,
  startsAt,
}: {
  playerSide: Side | null;
  startsAt: number | null;
}) {
  const seconds = useCountdownSeconds(startsAt);
  return (
    <StatusScreen title="Partida encontrada">
      <p className={ui.muted}>Você joga na {sideLabel(playerSide)}</p>
      <p className="text-5xl font-bold tabular-nums" aria-live="polite">
        {seconds}
      </p>
    </StatusScreen>
  );
}

function RematchButton({
  accepted,
  onRequestRematch,
}: {
  accepted: boolean;
  onRequestRematch: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRequestRematch}
      disabled={accepted}
      className={ui.btnSolid}
    >
      {accepted ? "Aguardando…" : "Jogar de novo"}
    </button>
  );
}

function opponentSide(playerSide: Side): Side {
  return playerSide === "left" ? "right" : "left";
}

function rematchFlags(
  playerSide: Side | null,
  rematchAccepted: { left: boolean; right: boolean },
) {
  if (playerSide === null) {
    return { playerAccepted: false, opponentAccepted: false };
  }
  return {
    playerAccepted: rematchAccepted[playerSide],
    opponentAccepted: rematchAccepted[opponentSide(playerSide)],
  };
}

function resultTitle(playerSide: Side | null, winner: Side | null): string {
  return playerSide !== null && winner === playerSide ? "Vitória" : "Derrota";
}

function rematchLabel(flags: {
  playerAccepted: boolean;
  opponentAccepted: boolean;
}): string {
  return `Você: ${flags.playerAccepted ? "ok" : "…"} · Oponente: ${flags.opponentAccepted ? "ok" : "…"}`;
}

type ResultScreenProps = {
  state: MatchState;
  onRequestRematch: () => void;
};

export function ResultScreen({ state, onRequestRematch }: ResultScreenProps) {
  const side = state.playerSide;
  const flags = rematchFlags(side, state.rematchAccepted);
  const { score, winner } = state.snapshot;
  return (
    <StatusScreen title={resultTitle(side, winner)}>
      <p className={ui.muted}>{score.left} — {score.right}</p>
      <p className={ui.muted}>{rematchLabel(flags)}</p>
      <RematchButton
        accepted={flags.playerAccepted}
        onRequestRematch={onRequestRematch}
      />
    </StatusScreen>
  );
}
