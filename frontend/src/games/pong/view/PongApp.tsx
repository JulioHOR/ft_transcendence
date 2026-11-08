import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { getProfileById } from "../../../api/profile";
import { Avatar as UserAvatar } from "../../../ui/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PerspectiveCamera } from "three";
import { PongScene } from "./PongScene";
import { usePaddleInput } from "./usePaddleInput";
import { SectionCard } from "../../../ui/SectionCard";
import {
  CountdownScreen,
  LeaveMatchButton,
  ResultScreen,
  ResumeModal,
  StatusScreen,
} from "./MatchScreens";
import type {
  GameSnapshot,
  MatchState,
  PlayerIds,
  Side,
  Transport,
} from "../protocol";
import type {
  BasicPhaseViewProps,
  CountdownPhaseProps,
  PhaseBackdropProps,
  PhaseStageProps,
  PhaseViewProps,
  PlayerProfiles,
  PlayerScoreCardProps,
  PlayerScoreboardProps,
  PlayingPhaseProps,
  PongAppProps,
  PongCanvasProps,
  PongStageProps,
  StatusPhaseProps,
} from "./props";
import { createInitialMatchState } from "../protocol";
import { logUnexpectedError } from "../../../api/http";
import {
  BASIC_PHASE_TITLES,
  GAME_SIDES,
  LEFT_PADDLE_COLOR,
  PONG_CAMERA,
  PONG_CANVAS_SX,
  PONG_MODAL_BACKDROP_SX,
  PONG_STAGE_OVERLAY_SX,
  RIGHT_PADDLE_COLOR,
  TABLE_SURFACE_Y,
} from "../constants";
/** Carrega os perfis dos dois jogadores da partida. */
async function loadPlayerProfiles(ids: PlayerIds): Promise<PlayerProfiles> {
  const profiles = await Promise.all(
    GAME_SIDES.map(async (side) => {
      const id = ids[side];
      if (id == null) return [side, null] as const;
      try {
        const profile = await getProfileById(id);
        return [side, profile] as const;
      } catch {
        return [side, null] as const;
      }
    }),
  );
  return Object.fromEntries(profiles) as PlayerProfiles;
}

/** Mantém os perfis exibidos no placar sincronizados com os IDs recebidos. */
function usePlayerProfiles(ids: PlayerIds, phase: MatchState["phase"]): PlayerProfiles {
  const { left, right } = ids;
  const [profiles, setProfiles] = useState<PlayerProfiles>({
    left: null,
    right: null,
  });

  useEffect(() => {
    let active = true;
    void loadPlayerProfiles({ left, right }).then((loaded) => {
      if (active) setProfiles(loaded);
    });
    return () => {
      active = false;
    };
  }, [left, right, phase]);

  return profiles;
}

/** Hook para gerenciar o estado da partida. */
function useMatchState(transport: Transport): MatchState {
  const [state, setState] = useState(createInitialMatchState);

  useEffect(() => {
    transport.onState(setState);
    void transport.connect().catch((failure: unknown) => {
      logUnexpectedError("Falha ao conectar ao Pong", failure);
      setState((current) => ({
        ...current,
        phase: "error",
        errorMessage: "Não foi possível entrar na partida. Tente novamente.",
      }));
    });
    return () => transport.disconnect();
  }, [transport]);

  return state;
}
/** Calcula a distância da câmera para enquadrar a mesa. */
function calculateCameraDistance(
  verticalHalfSize: number,
  horizontalHalfSize: number,
  verticalFov: number,
  horizontalFov: number,
): number {
  const verticalDistance = verticalHalfSize / Math.tan(verticalFov / 2);

  const horizontalDistance = horizontalHalfSize / Math.tan(horizontalFov / 2);

  const requiredDistance = Math.max(verticalDistance, horizontalDistance);

  return requiredDistance * PONG_CAMERA.margin;
}

/** Aumenta o campo de visão em telas largas para preservar a proporção da mesa. */
function getCameraFov(aspect: number): number {
  return Math.min(
    PONG_CAMERA.maxFov,
    PONG_CAMERA.fov +
      Math.max(0, aspect - PONG_CAMERA.wideAspectStart) *
        PONG_CAMERA.wideFovStep,
  );
}

/** Ajusta a câmera para enquadrar a mesa na tela. */
function frameTableCamera(
  camera: PerspectiveCamera,
  width: number,
  height: number,
): void {
  const aspect = width / Math.max(height, 1);
  const wideFov = getCameraFov(aspect);
  camera.fov = wideFov;
  const vFov = (wideFov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance = calculateCameraDistance(
    PONG_CAMERA.viewHalfZ,
    PONG_CAMERA.viewHalfX,
    vFov,
    hFov,
  );
  camera.position.set(
    0,
    TABLE_SURFACE_Y + distance * PONG_CAMERA.elevation,
    distance * PONG_CAMERA.depth,
  );
  camera.lookAt(0, TABLE_SURFACE_Y, 0);
  camera.near = 0.1; camera.far = distance * 5;
  camera.updateProjectionMatrix();
}

/**
 * Mantém a câmera de perspectiva ajustada para enquadrar a mesa dentro do Canvas.
 *
 * O ajuste é reaplicado quando a câmera ou as dimensões do Canvas mudam,
 * garantindo o enquadramento após redimensionamentos da tela.
 *
 * @returns `null`, pois o componente executa apenas lógica de configuração.
 */
function FitTableCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    frameTableCamera(camera, size.width, size.height);
  }, [camera, size.width, size.height]);

  return null;
}

/** Componente para exibir a cena do jogo com a pontuação. */
function PongStage({ snapshot, playerSide, profiles, phase }: PongStageProps) {
  return (
    <Box
      sx={{ position: "relative", height: "100%", width: "100%", minHeight: 0 }}
    >
      <Stack sx={PONG_STAGE_OVERLAY_SX}>
        <PlayerScoreboard
          score={snapshot.score}
          profiles={profiles}
          phase={phase}
        />
        <Typography
          variant="body2"
          sx={{ px: 1, color: "text.secondary", fontWeight: 600 }}
        >
          {getServeMessage(snapshot, playerSide)}
        </Typography>
      </Stack>
      <Box sx={PONG_CANVAS_SX}>
        <PongCanvas snapshot={snapshot} />
      </Box>
    </Box>
  );
}

/** Renderiza o Canvas separado da camada DOM de placar e instruções. */
function PongCanvas({ snapshot }: PongCanvasProps) {
  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <Canvas camera={{ fov: PONG_CAMERA.fov, near: 0.1, far: 200 }} shadows>
        <FitTableCamera />
        <PongScene snapshot={snapshot} />
      </Canvas>
    </Box>
  );
}

/** Retorna a instrução de controle adequada ao estado do saque. */
function getServeMessage(snapshot: GameSnapshot, playerSide: Side | null) {
  if (snapshot.serveSide === null) return "W/S ou ↑/↓ para mover a raquete";
  return snapshot.serveSide === playerSide
    ? "Espaço para sacar • W/S ou ↑/↓ para mover"
    : "Aguardando o saque do oponente • W/S ou ↑/↓ para mover";
}

/** Mantém a cena visível enquanto apresenta um estado da partida. */
function PhaseStage({ state, profiles, children }: PhaseStageProps) {
  return (
    <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
      <PongStage
        snapshot={state.snapshot}
        playerSide={state.playerSide}
        profiles={profiles}
        phase={state.phase}
      />
      <PhaseBackdrop>{children}</PhaseBackdrop>
    </Box>
  );
}

/** Aplica o cartão visual comum às telas sobrepostas. */
function PhaseBackdrop({ children }: PhaseBackdropProps) {
  return (
    <Stack sx={PONG_MODAL_BACKDROP_SX}>
      <SectionCard
        elevation={8}
        sx={{
          width: "min(100%, 640px)",
          maxHeight: "100%",
          overflow: "auto",
          border: "1px solid",
          borderColor: "primary.main",
          bgcolor: "rgba(10, 24, 37, 0.96)",
          color: "common.white",
          "& [role='status']": { height: "auto", width: "100%" },
        }}
      >
        {children}
      </SectionCard>
    </Stack>
  );
}

/** Exibe os dois jogadores e seus placares no topo da mesa. */
function PlayerScoreboard({
  score,
  profiles,
  phase,
}: PlayerScoreboardProps) {
  return (
    <Stack
      direction="row"
      sx={{ width: "100%", justifyContent: "space-between", px: 1 }}
    >
      <PlayerScoreCard
        side="left"
        profile={profiles.left}
        score={score.left}
        phase={phase}
      />
      <PlayerScoreCard
        side="right"
        profile={profiles.right}
        score={score.right}
        phase={phase}
      />
    </Stack>
  );
}

/** Exibe avatar, nome e placar de um lado da mesa. */
function PlayerScoreCard({ side, profile, score, phase }: PlayerScoreCardProps) {
  const label = profile?.nickname ?? "Jogador";
  return (
    <Stack sx={playerCardSx(side)}>
      <UserAvatar
        key={`${side}-${phase}-${profile?.avatarUrl ?? "default"}`}
        avatarUrl={profile?.avatarUrl}
        alt={label}
        size="xl"
        borderColor={side === "left" ? LEFT_PADDLE_COLOR : RIGHT_PADDLE_COLOR}
      />
      <Typography variant="body1" noWrap sx={playerNameSx}>
        {label}
      </Typography>
      <Typography variant="h2" component="span" sx={{ lineHeight: 1 }}>
        {score}
      </Typography>
    </Stack>
  );
}

const playerNameSx = { maxWidth: 160, fontWeight: 700, pt: 0.5 } as const;

/** Retorna o estilo compartilhado dos cartões dos jogadores. */
function playerCardSx(side: Side) {
  const color = side === "left" ? LEFT_PADDLE_COLOR : RIGHT_PADDLE_COLOR;
  return {
    width: "50%",
    alignItems: "center",
    gap: 0.55,
    color,
    pointerEvents: "auto",
  };
}

/**
 * Renderiza a visualização da fase atual da partida,
 * exibindo a tela apropriada com base no estado do jogo.
 * @param state - Estado atual da partida.
 * @param onRequestRematch - Função chamada quando o jogador solicita um rematch.
 * @returns Componente React representando a fase atual da partida.
 */
function PhaseView(props: PhaseViewProps): ReactNode {
  const SpecialScreen = specialScreens[props.state.phase];
  return SpecialScreen ? (
    <SpecialScreen {...props} />
  ) : (
    <BasicPhaseView state={props.state} profiles={props.profiles} />
  );
}

const specialScreens: Partial<
  Record<MatchState["phase"], (props: PhaseViewProps) => ReactNode>
> = {
  finished: (props) => (
    <PhaseStage state={props.state} profiles={props.profiles}>
      <ResultScreen
        state={props.state}
        onRequestRematch={props.onRequestRematch}
        onRequestLeave={props.onRequestLeave}
      />
    </PhaseStage>
  ),
  resume_pending: (props) => <PausedPhase {...props} />,
  opponent_disconnected: (props) => (
    <PhaseStage state={props.state} profiles={props.profiles}>
      <StatusScreen title="Oponente reconectando…">
        <LeaveMatchButton onLeave={props.onRequestLeave} />
      </StatusScreen>
    </PhaseStage>
  ),
};

/** Exibe o modal de pausa sobre a cena atual. */
function PausedPhase({
  state,
  profiles,
  onRequestResume,
  onRequestLeave,
}: PhaseViewProps) {
  return (
    <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
      <PongStage
        snapshot={state.snapshot}
        playerSide={state.playerSide}
        profiles={profiles}
        phase={state.phase}
      />
      <ResumeModal
        state={state}
        onRequestResume={onRequestResume}
        onRequestLeave={onRequestLeave}
      />
    </Box>
  );
}

/** Seleciona a visualização básica da fase atual. */
function BasicPhaseView({ state, profiles }: BasicPhaseViewProps): ReactNode {
  if (state.phase === "playing") {
    return <PlayingPhase state={state} profiles={profiles} />;
  }
  if (state.phase === "countdown") {
    return <CountdownPhase state={state} profiles={profiles} />;
  }
  return (
    <StatusPhase
      state={state}
      profiles={profiles}
      title={basicPhaseTitle(state)}
    />
  );
}

/** Renderiza a mesa durante a partida. */
function PlayingPhase({ state, profiles }: PlayingPhaseProps) {
  return (
    <PongStage
      snapshot={state.snapshot}
      playerSide={state.playerSide}
      profiles={profiles}
      phase={state.phase}
    />
  );
}

/** Retorna o título usado pelas fases básicas. */
function basicPhaseTitle(state: MatchState): string {
  return (
    BASIC_PHASE_TITLES[state.phase] ?? state.errorMessage ?? "Algo deu errado"
  );
}

/** Exibe uma mensagem de estado sobre a mesa. */
function StatusPhase({ state, title, profiles }: StatusPhaseProps) {
  return (
    <PhaseStage state={state} profiles={profiles}>
      <StatusScreen title={title} />
    </PhaseStage>
  );
}

/** Exibe a contagem regressiva sobre a mesa. */
function CountdownPhase({ state, profiles }: CountdownPhaseProps) {
  return (
    <PhaseStage state={state} profiles={profiles}>
      <CountdownScreen
        playerSide={state.playerSide}
        startsAt={state.startsAt}
      />
    </PhaseStage>
  );
}

/**
 * Componente principal do jogo.
 * @param transport - Instância de transporte para comunicação com o servidor.
 * @returns Componente React representando o jogo.
 */
export function PongApp({ transport }: PongAppProps) {
  const state = useMatchState(transport);
  const profiles = usePlayerProfiles(state.playerIds, state.phase);
  useGameControls(transport, state);

  return (
    <Box sx={{ height: "100%", width: "100%", minHeight: 0 }}>
      <PhaseView
        state={state}
        profiles={profiles}
        onRequestRematch={() => transport.requestRematch()}
        onRequestResume={() => transport.requestResume()}
        onRequestLeave={() => transport.requestLeave()}
      />
    </Box>
  );
}

/** Conecta o estado da partida ao controle local das raquetes. */
function useGameControls(transport: Transport, state: MatchState): void {
  const paddlePosition =
    state.playerSide === "right"
      ? state.snapshot.rightPaddlePosition
      : state.snapshot.leftPaddlePosition;
  usePaddleInput(transport, {
    enabled:
      state.phase === "playing" &&
      state.snapshot.winner === null &&
      state.snapshot.timestamp > 0,
    paddlePosition,
  });
}
