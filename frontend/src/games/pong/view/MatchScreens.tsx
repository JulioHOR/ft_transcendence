import { useEffect, useState, type ReactNode } from "react";
import type { MatchState, Side } from "../protocol";
import { ui } from "../../../ui/classes";

/** Componente para exibir uma tela de status. */
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

/** Hook para calcular os segundos restantes na contagem regressiva. */
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

/** Componente para exibir a tela de contagem regressiva. */
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

/** Componente para exibir o botão de rematch. */
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

/** Retorna os status de aceitação do rematch para o jogador e o oponente. */
type AcceptanceFlags = {
  playerAccepted: boolean;
  opponentAccepted: boolean;
};

function acceptanceFlags(
  playerSide: Side | null,
  rematchAccepted: { left: boolean; right: boolean },
): AcceptanceFlags {
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

function acceptanceLabel(flags: {
  playerAccepted: boolean;
  opponentAccepted: boolean;
}): string {
  return `Você: ${flags.playerAccepted ? "ok" : "…"} · Oponente: ${flags.opponentAccepted ? "ok" : "…"}`;
}

export function LeaveMatchButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button type="button" onClick={onLeave} className={ui.btnSolid}>
      Encerrar partida
    </button>
  );
}

type ResultScreenProps = {
  state: MatchState;
  onRequestRematch: () => void;
  onRequestLeave: () => void;
};

/** Componente para exibir a tela de resultado da partida. */
export function ResultScreen({ state, onRequestRematch, onRequestLeave }: ResultScreenProps) {
  const side = state.playerSide;
  const flags = acceptanceFlags(side, state.rematchAccepted);
  const { score, winner } = state.snapshot;
  return (
    <StatusScreen title={resultTitle(side, winner)}>
      <p className={ui.muted}>{score.left} — {score.right}</p>
      <p className={ui.muted}>{acceptanceLabel(flags)}</p>
      <RematchButton
        accepted={flags.playerAccepted}
        onRequestRematch={onRequestRematch}
      />
      <LeaveMatchButton onLeave={onRequestLeave} />
    </StatusScreen>
  );
}

/** Exibe os aceites enquanto os dois jogadores confirmam a retomada. */
export function ResumeScreen({
  state,
  onRequestResume,
  onRequestLeave,
}: {
  state: MatchState;
  onRequestResume: () => void;
  onRequestLeave: () => void;
}) {
  const side = state.playerSide;
  const flags = acceptanceFlags(side, state.resumeAccepted);
  return (
    <StatusScreen title="Partida pausada">
      <p className={ui.muted}>Os dois jogadores precisam confirmar para continuar.</p>
      <p className={ui.muted}>{acceptanceLabel(flags)}</p>
      <ResumeActions
        flags={flags}
        onRequestResume={onRequestResume}
        onRequestLeave={onRequestLeave}
      />
    </StatusScreen>
  );
}

function ResumeActions({
  flags,
  onRequestResume,
  onRequestLeave,
}: {
  flags: AcceptanceFlags;
  onRequestResume: () => void;
  onRequestLeave: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onRequestResume}
        disabled={flags.playerAccepted}
        className={ui.btnSolid}
      >
        {flags.playerAccepted ? "Aguardando oponente…" : "Continuar partida"}
      </button>
      <LeaveMatchButton onLeave={onRequestLeave} />
    </>
  );
}
