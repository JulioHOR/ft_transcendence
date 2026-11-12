import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { getProfileById } from "../../../api/profile";
import { Avatar as UserAvatar } from "../../../ui/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  PerspectiveCamera,
  WebGLRenderer,
  type WebGLRendererParameters,
} from "three";
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

/** Loads the profiles of both players in the match. */
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

/** Keeps the profiles shown on the scoreboard synchronized with the received IDs. */
function usePlayerProfiles(
  ids: PlayerIds,
  phase: MatchState["phase"],
): PlayerProfiles {
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

/** Hook for managing the match state. */
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
/** Calculates the camera distance needed to frame the table. */
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

/** Increases the field of view on wide screens to preserve the table's proportions. */
function getCameraFov(aspect: number): number {
  return Math.min(
    PONG_CAMERA.maxFov,
    PONG_CAMERA.fov +
      Math.max(0, aspect - PONG_CAMERA.wideAspectStart) *
        PONG_CAMERA.wideFovStep,
  );
}

/** Adjusts the camera to frame the table on screen. */
function positionTableCamera(
  camera: PerspectiveCamera,
  distance: number,
): void {
  camera.position.set(
    0,
    TABLE_SURFACE_Y + distance * PONG_CAMERA.elevation,
    distance * PONG_CAMERA.depth,
  );
  camera.lookAt(0, TABLE_SURFACE_Y, 0);
}

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
  positionTableCamera(camera, distance);
  camera.near = 0.1;
  camera.far = distance * 5;
  camera.updateProjectionMatrix();
}

/**
 * Keeps the perspective camera adjusted to frame the table inside the Canvas.
 *
 * The adjustment is reapplied when the camera or Canvas dimensions change,
 * ensuring the table remains framed after the screen is resized.
 */
function FitTableCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    frameTableCamera(camera, size.width, size.height);
  }, [camera, size.width, size.height]);

  return null;
}

/** Releases graphics resources without forcing context loss when leaving the route. */
function createPongRenderer(defaults: WebGLRendererParameters) {
  const renderer = new WebGLRenderer(defaults);
  renderer.forceContextLoss = () => {};
  return renderer;
}

/** Component for displaying the game scene with the score. */
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

/** Renders the Canvas separately from the DOM layer containing the scoreboard and instructions. */
function PongCanvas({ snapshot }: PongCanvasProps) {
  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <Canvas
        gl={createPongRenderer}
        camera={{ fov: PONG_CAMERA.fov, near: 0.1, far: 200 }}
        shadows="basic"
      >
        <FitTableCamera />
        <PongScene snapshot={snapshot} />
      </Canvas>
    </Box>
  );
}

/** Returns the control instruction appropriate to the serve state. */
function getServeMessage(snapshot: GameSnapshot, playerSide: Side | null) {
  if (snapshot.serveSide === null) return "W/S ou ↑/↓ para mover a raquete";
  return snapshot.serveSide === playerSide
    ? "Espaço para sacar • W/S ou ↑/↓ para mover"
    : "Aguardando o saque do oponente • W/S ou ↑/↓ para mover";
}

/** Keeps the scene visible while displaying a match state. */
function PhaseStage({ children }: PhaseStageProps) {
  return <PhaseBackdrop>{children}</PhaseBackdrop>;
}

/** Applies the shared visual card to the overlay screens. */
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

/** Displays both players and their scores at the top of the table. */
function PlayerScoreboard({ score, profiles, phase }: PlayerScoreboardProps) {
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

/** Displays the avatar, name, and score for one side of the table. */
function PlayerScoreCard({
  side,
  profile,
  score,
  phase,
}: PlayerScoreCardProps) {
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

/** Returns the shared style for the player cards. */
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
 * Renders the view for the current match phase,
 * displaying the appropriate screen based on the game state.
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
    <PhaseStage>
      <ResultScreen
        state={props.state}
        onRequestRematch={props.onRequestRematch}
        onRequestLeave={props.onRequestLeave}
      />
    </PhaseStage>
  ),
  resume_pending: (props) => <PausedPhase {...props} />,
  opponent_disconnected: (props) => (
    <PhaseStage>
      <StatusScreen title="Oponente reconectando…">
        <LeaveMatchButton onLeave={props.onRequestLeave} />
      </StatusScreen>
    </PhaseStage>
  ),
};

/** Displays the pause modal over the current scene. */
function PausedPhase({
  state,
  onRequestResume,
  onRequestLeave,
}: PhaseViewProps) {
  return (
    <ResumeModal
      state={state}
      onRequestResume={onRequestResume}
      onRequestLeave={onRequestLeave}
    />
  );
}

/** Selects the basic view for the current phase. */
function BasicPhaseView({ state, profiles }: BasicPhaseViewProps): ReactNode {
  if (state.phase === "playing") {
    return null;
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

/** Returns the title used by the basic phases. */
function basicPhaseTitle(state: MatchState): string {
  return (
    BASIC_PHASE_TITLES[state.phase] ?? state.errorMessage ?? "Algo deu errado"
  );
}

/** Displays a status message over the table. */
function StatusPhase({ title }: StatusPhaseProps) {
  return (
    <PhaseStage>
      <StatusScreen title={title} />
    </PhaseStage>
  );
}

/** Displays the countdown over the table. */
function CountdownPhase({ state }: CountdownPhaseProps) {
  return (
    <PhaseStage>
      <CountdownScreen
        playerSide={state.playerSide}
        startsAt={state.startsAt}
      />
    </PhaseStage>
  );
}

/**
 * Main game component.
 */
export function PongApp({ transport }: PongAppProps) {
  const state = useMatchState(transport);
  const profiles = usePlayerProfiles(state.playerIds, state.phase);
  useGameControls(transport, state);

  return <PongMatch state={state} profiles={profiles} transport={transport} />;
}

type PongMatchProps = {
  state: MatchState;
  profiles: PlayerProfiles;
  transport: Transport;
};

const PONG_APP_SX = {
  position: "relative",
  height: "100%",
  width: "100%",
  minHeight: 0,
} as const;

/** Keeps the 3D scene stable while switching between match screens. */
function PongMatch({ state, profiles, transport }: PongMatchProps) {
  return (
    <Box sx={PONG_APP_SX}>
      <PongStage
        snapshot={state.snapshot}
        playerSide={state.playerSide}
        profiles={profiles}
        phase={state.phase}
      />
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

/** Connects the match state to local paddle controls. */
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
