import { useEffect, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { MatchState, Side } from "../protocol";
import { SectionCard } from "../../../ui/SectionCard";
import { AppIcon } from "../../../ui/AppIcon";

type StatusScreenProps = {
  title: string;
  titleColor?: string;
  children?: ReactNode;
};

/** Componente para exibir uma tela de status. */
export function StatusScreen({
  title,
  titleColor,
  children,
}: StatusScreenProps) {
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
      <Typography variant="h2" color={titleColor}>
        {title}
      </Typography>
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
  const won =
    state.playerSide !== null && state.snapshot.winner === state.playerSide;
  const accepted = state.playerSide
    ? state.rematchAccepted[state.playerSide]
    : false;
  return (
    <StatusScreen
      title={resultTitle(state.playerSide, state.snapshot.winner)}
      titleColor={won ? "success.main" : "error.main"}
    >
      <ResultDetails state={state} />
      <RematchButton accepted={accepted} onRequestRematch={onRequestRematch} />
      <LeaveMatchButton onLeave={onRequestLeave} />
    </StatusScreen>
  );
}

function ResultDetails({ state }: { state: MatchState }) {
  const side = state.playerSide;
  const { score } = state.snapshot;
  const playerScore = side === "right" ? score.right : score.left;
  const opponentScore = side === "right" ? score.left : score.right;
  const flags = acceptanceFlags(side, state.rematchAccepted);
  return (
    <SectionCard sx={{ width: "100%", maxWidth: 480 }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <ScorePlayer label="Você" score={playerScore} />
          <Typography variant="h2" color="text.secondary">
            —
          </Typography>
          <ScorePlayer label="Oponente" score={opponentScore} />
        </Stack>
        <AcceptanceStatus flags={flags} />
      </Stack>
    </SectionCard>
  );
}

function ScorePlayer(props: { label: string; score: number }) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: "center" }}>
      <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {props.score}
      </Typography>
      <Typography color="text.secondary">{props.label}</Typography>
    </Stack>
  );
}

type AcceptanceStatusProps = { flags: AcceptanceFlags; pendingLabel?: string };

function AcceptanceStatus({
  flags,
  pendingLabel = "Você não confirmou",
}: AcceptanceStatusProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ flexWrap: "wrap", justifyContent: "center" }}
    >
      <ConfirmationChip
        accepted={flags.playerAccepted}
        label={flags.playerAccepted ? "Você confirmou" : pendingLabel}
      />
      <ConfirmationChip
        accepted={flags.opponentAccepted}
        label={
          flags.opponentAccepted ? "Oponente confirmou" : "Aguardando oponente"
        }
      />
    </Stack>
  );
}

function ConfirmationChip({
  accepted,
  label,
}: {
  accepted: boolean;
  label: string;
}) {
  return (
    <Chip
      size="small"
      label={label}
      color={accepted ? "success" : "default"}
      variant={accepted ? "filled" : "outlined"}
    />
  );
}

type ResumeScreenProps = {
  state: MatchState;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Exibe os aceites enquanto os dois jogadores confirmam a retomada. */
export function ResumeScreen({
  state,
  onRequestResume,
  onRequestLeave,
}: ResumeScreenProps) {
  const side = state.playerSide;
  const flags = acceptanceFlags(side, state.resumeAccepted);
  return (
    <StatusScreen title="Partida pausada">
      <AppIcon name="pause" color="primary" sx={{ fontSize: 48 }} />
      <Typography color="text.secondary">
        Os dois jogadores precisam confirmar para continuar.
      </Typography>
      <AcceptanceStatus flags={flags} pendingLabel="Você precisa confirmar" />
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
