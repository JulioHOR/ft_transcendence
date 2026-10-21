import { useEffect, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { MatchState, Side } from "../protocol";

/** Componente para exibir uma tela de status. */
export function StatusScreen({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <Stack
      role="status"
      spacing={2}
      sx={{
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3 },
        textAlign: "center",
      }}
    >
      <Typography variant="h2">{title}</Typography>
      {children}
    </Stack>
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
      <Typography color="text.secondary">
        Você joga na {sideLabel(playerSide)}
      </Typography>
      <CountdownNumber seconds={seconds} />
    </StatusScreen>
  );
}

function CountdownNumber({ seconds }: { seconds: number }) {
  return (
    <Typography
      component="div"
      variant="h1"
      aria-live="polite"
      sx={{
        fontSize: "clamp(3rem, 12vw, 5rem)",
        fontVariantNumeric: "tabular-nums",
        color: "primary.main",
      }}
    >
      {seconds}
    </Typography>
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
    <Button
      type="button"
      onClick={onRequestRematch}
      disabled={accepted}
      variant="contained"
      color="primary"
    >
      {accepted ? "Aguardando…" : "Jogar de novo"}
    </Button>
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
    <Button type="button" onClick={onLeave} variant="outlined" color="inherit">
      Encerrar partida
    </Button>
  );
}

type ResultScreenProps = {
  state: MatchState;
  onRequestRematch: () => void;
  onRequestLeave: () => void;
};

/** Componente para exibir a tela de resultado da partida. */
export function ResultScreen({
  state,
  onRequestRematch,
  onRequestLeave,
}: ResultScreenProps) {
  const side = state.playerSide;
  const flags = acceptanceFlags(side, state.rematchAccepted);
  const { score, winner } = state.snapshot;
  return (
    <StatusScreen title={resultTitle(side, winner)}>
      <Typography variant="h2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {score.left} — {score.right}
      </Typography>
      <Typography color="text.secondary">{acceptanceLabel(flags)}</Typography>
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
      <Typography color="text.secondary">
        Os dois jogadores precisam confirmar para continuar.
      </Typography>
      <Typography color="text.secondary">{acceptanceLabel(flags)}</Typography>
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
      <Button
        type="button"
        onClick={onRequestResume}
        disabled={flags.playerAccepted}
        variant="contained"
        color="primary"
      >
        {flags.playerAccepted ? "Aguardando oponente…" : "Continuar partida"}
      </Button>
      <LeaveMatchButton onLeave={onRequestLeave} />
    </>
  );
}
