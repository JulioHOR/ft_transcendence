import { useEffect, useState } from "react";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { AcceptanceBySide, Side } from "../protocol";
import { ActionButton } from "../../../ui/ActionButton";
import { SectionCard } from "../../../ui/SectionCard";
import { PONG_MODAL_BACKDROP_SX, RESUME_CARD_SX } from "../constants";
import { AppIcon } from "../../../ui/AppIcon";
import type {
  AcceptanceFlags,
  AcceptanceStatusProps,
  ConfirmationChipProps,
  CountdownNumberProps,
  CountdownScreenProps,
  LeaveMatchButtonProps,
  RematchButtonProps,
  ResultActionsProps,
  ResultDetailsProps,
  ResultScreenProps,
  ResumeActionsProps,
  ResumeScreenProps,
  ScorePlayerProps,
  StatusScreenProps,
} from "./props";

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

/** Converte o lado da partida em uma descrição exibida ao jogador. */
function sideLabel(side: Side | null): string {
  if (side === "left") return "esquerda";
  if (side === "right") return "direita";
  return "?";
}

/** Componente para exibir a tela de contagem regressiva. */
export function CountdownScreen({
  playerSide,
  startsAt,
}: CountdownScreenProps) {
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

/** Exibe o número atual da contagem regressiva. */
function CountdownNumber({ seconds }: CountdownNumberProps) {
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
function RematchButton({ accepted, onRequestRematch }: RematchButtonProps) {
  return (
    <ActionButton
      appearance="primary"
      type="button"
      onClick={onRequestRematch}
      disabled={accepted}
      sx={{ flex: 1 }}
    >
      {accepted ? "Aguardando…" : "Jogar de novo"}
    </ActionButton>
  );
}

/** Retorna o lado oposto ao jogador informado. */
function opponentSide(playerSide: Side): Side {
  return playerSide === "left" ? "right" : "left";
}

/** Retorna os status de aceitação do rematch para o jogador e o oponente. */
function acceptanceFlags(
  playerSide: Side | null,
  rematchAccepted: AcceptanceBySide,
): AcceptanceFlags {
  if (playerSide === null) {
    return { playerAccepted: false, opponentAccepted: false };
  }
  return {
    playerAccepted: rematchAccepted[playerSide],
    opponentAccepted: rematchAccepted[opponentSide(playerSide)],
  };
}

/** Calcula o título do resultado para o jogador atual. */
function resultTitle(playerSide: Side | null, winner: Side | null): string {
  return playerSide !== null && winner === playerSide ? "Vitória" : "Derrota";
}

/** Exibe a ação para encerrar a partida atual. */
export function LeaveMatchButton({
  onLeave,
  equalWidth = false,
}: LeaveMatchButtonProps) {
  return (
    <ActionButton
      appearance="secondary"
      type="button"
      onClick={onLeave}
      sx={equalWidth ? { flex: 1 } : undefined}
    >
      Encerrar partida
    </ActionButton>
  );
}

/** Componente para exibir a tela de resultado da partida. */
export function ResultScreen({
  state,
  onRequestRematch,
  onRequestLeave,
}: ResultScreenProps) {
  const won = state.playerSide !== null && state.snapshot.winner === state.playerSide;
  const accepted = state.playerSide !== null && state.rematchAccepted[state.playerSide];
  return (
    <StatusScreen
      title={resultTitle(state.playerSide, state.snapshot.winner)}
      titleColor={won ? "success.main" : "error.main"}
    >
      <AppIcon name={won ? "achievement" : "competitor"} color={won ? "success" : "error"} sx={{ fontSize: 48 }} />
      <ResultDetails state={state} />
      <ResultActions
        accepted={accepted}
        onRequestRematch={onRequestRematch}
        onRequestLeave={onRequestLeave}
      />
    </StatusScreen>
  );
}

/** Organiza as ações principais do resultado em uma única linha responsiva. */
function ResultActions({
  accepted,
  onRequestRematch,
  onRequestLeave,
}: ResultActionsProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ width: "100%", maxWidth: 420 }}
    >
      <RematchButton
        accepted={accepted}
        onRequestRematch={onRequestRematch}
      />
      <LeaveMatchButton onLeave={onRequestLeave} equalWidth />
    </Stack>
  );
}

/** Exibe placares e confirmações do resultado. */
function ResultDetails({ state }: ResultDetailsProps) {
  const side = state.playerSide;
  const { score } = state.snapshot;
  const playerScore = side === "right" ? score.right : score.left;
  const opponentScore = side === "right" ? score.left : score.right;
  const flags = acceptanceFlags(side, state.rematchAccepted);
  return (
    <Stack spacing={2} sx={{ width: "100%", maxWidth: 420 }}>
      <Stack
        direction="row"
        spacing={{ xs: 1.5, sm: 3 }}
        sx={{ alignItems: "center", justifyContent: "center" }}
      >
        <ScorePlayer label="Você" score={playerScore} />
        <Typography variant="h2" color="text.secondary">
          vs
        </Typography>
        <ScorePlayer label="Oponente" score={opponentScore} />
      </Stack>
      <AcceptanceStatus flags={flags} />
    </Stack>
  );
}

/** Exibe uma pontuação com seu rótulo. */
function ScorePlayer(props: ScorePlayerProps) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: "center" }}>
      <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {props.score}
      </Typography>
      <Typography color="text.secondary">{props.label}</Typography>
    </Stack>
  );
}

/** Exibe o estado de confirmação dos dois jogadores. */
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

/** Exibe uma confirmação individual em formato de chip. */
function ConfirmationChip({ accepted, label }: ConfirmationChipProps) {
  return (
    <Chip
      size="small"
      label={label}
      color={accepted ? "success" : "default"}
      variant={accepted ? "filled" : "outlined"}
    />
  );
}

/** Mantém a mesa visível e apresenta a pausa como modal sobre o jogo. */
export function ResumeModal({
  state,
  onRequestResume,
  onRequestLeave,
}: ResumeScreenProps) {
  return (
    <Stack role="dialog" aria-modal="true" sx={PONG_MODAL_BACKDROP_SX}>
      <SectionCard elevation={8} sx={RESUME_CARD_SX}>
        <ResumeContent
          state={state}
          onRequestResume={onRequestResume}
          onRequestLeave={onRequestLeave}
        />
      </SectionCard>
    </Stack>
  );
}

/** Renderiza o conteúdo do modal de pausa. */
function ResumeContent({
  state,
  onRequestResume,
  onRequestLeave,
}: ResumeScreenProps) {
  const flags = acceptanceFlags(state.playerSide, state.resumeAccepted);
  return (
    <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
      <Typography variant="h3">Partida pausada</Typography>
      <AppIcon name="pause" color="primary" sx={{ fontSize: 48 }} />
      <Typography color="grey.300">
        Os dois jogadores precisam confirmar para continuar.
      </Typography>
      <AcceptanceStatus flags={flags} pendingLabel="Você precisa confirmar" />
      <ResumeActions
        flags={flags}
        onRequestResume={onRequestResume}
        onRequestLeave={onRequestLeave}
      />
    </Stack>
  );
}

/** Renderiza as ações disponíveis no modal de pausa. */
function ResumeActions({
  flags,
  onRequestResume,
  onRequestLeave,
}: ResumeActionsProps) {
  return (
    <>
      <ActionButton
        appearance="primary"
        type="button"
        onClick={onRequestResume}
        disabled={flags.playerAccepted}
      >
        {flags.playerAccepted ? "Aguardando oponente…" : "Continuar partida"}
      </ActionButton>
      <LeaveMatchButton onLeave={onRequestLeave} />
    </>
  );
}
