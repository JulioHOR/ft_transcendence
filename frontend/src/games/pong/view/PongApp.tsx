import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PerspectiveCamera } from "three";
import { PongScene } from "./PongScene";
import { usePaddleInput } from "./usePaddleInput";
import {
  CountdownScreen,
  LeaveMatchButton,
  ResultScreen,
  ResumeScreen,
  StatusScreen,
} from "./MatchScreens";
import type { GameSnapshot, MatchState, Transport } from "../protocol";
import { createInitialMatchState, TABLE } from "../protocol";

/** Metade da largura da visualização da mesa. */
const VIEW_HALF_X = TABLE.halfLength * 1.2;
/** Metade da altura da visualização da mesa. */
const VIEW_HALF_Z = TABLE.halfWidth * 1.35;

/** Hook para gerenciar o estado da partida. */
function useMatchState(transport: Transport): MatchState {
  const [state, setState] = useState(createInitialMatchState);

  useEffect(() => {
    transport.onState(setState);
    void transport.connect();
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

  const CAMERA_MARGIN = 1.2;
  return requiredDistance * CAMERA_MARGIN;
}

/** Ajusta a câmera para enquadrar a mesa na tela. */
function frameTableCamera(
  camera: PerspectiveCamera,
  width: number,
  height: number,
): void {
  const aspect = width / Math.max(height, 1);
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance = calculateCameraDistance(
    VIEW_HALF_Z,
    VIEW_HALF_X,
    vFov,
    hFov,
  );
  camera.position.set(0, distance * 0.72, distance * 0.72);
  camera.lookAt(0, 0, 0);
  camera.near = 0.1;
  camera.far = distance * 5;
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
function PongStage({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <Box
      sx={{ position: "relative", height: "100%", width: "100%", minHeight: 0 }}
    >
      <ScoreOverlay score={snapshot.score} />
      <Box sx={{ position: "absolute", inset: 0 }}>
        <Canvas camera={{ fov: 45, near: 0.1, far: 200 }}>
          <FitTableCamera />
          <PongScene snapshot={snapshot} />
        </Canvas>
      </Box>
    </Box>
  );
}

function ScoreOverlay({ score }: { score: GameSnapshot["score"] }) {
  return (
    <Typography
      component="div"
      aria-live="polite"
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1.5,
        zIndex: 1,
        textAlign: "center",
        pointerEvents: "none",
        fontFamily: "monospace",
        fontSize: { xs: "1.25rem", sm: "1.5rem" },
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: "#edf4ef",
      }}
    >
      {score.left} — {score.right}
    </Typography>
  );
}

/** Propriedades da fase atual da partida. */
type PhaseViewProps = {
  state: MatchState;
  onRequestRematch: () => void;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

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
    <BasicPhaseView state={props.state} />
  );
}

const specialScreens: Partial<
  Record<MatchState["phase"], (props: PhaseViewProps) => ReactNode>
> = {
  finished: ({ state, onRequestRematch, onRequestLeave }) => (
    <ResultScreen
      state={state}
      onRequestRematch={onRequestRematch}
      onRequestLeave={onRequestLeave}
    />
  ),
  resume_pending: ({ state, onRequestResume, onRequestLeave }) => (
    <ResumeScreen
      state={state}
      onRequestResume={onRequestResume}
      onRequestLeave={onRequestLeave}
    />
  ),
  opponent_disconnected: ({ onRequestLeave }) => (
    <StatusScreen title="Oponente reconectando…">
      <LeaveMatchButton onLeave={onRequestLeave} />
    </StatusScreen>
  ),
};

function BasicPhaseView({ state }: { state: MatchState }): ReactNode {
  switch (state.phase) {
    case "connecting":
      return <StatusScreen title="Conectando…" />;
    case "waiting":
      return <StatusScreen title="Aguardando oponente" />;
    case "countdown":
      return (
        <CountdownScreen
          playerSide={state.playerSide}
          startsAt={state.startsAt}
        />
      );
    case "playing":
      return <PongStage snapshot={state.snapshot} />;
    case "opponent_left":
      return <StatusScreen title="Partida encerrada" />;
    default:
      return <StatusScreen title={state.errorMessage ?? "Algo deu errado"} />;
  }
}

/**
 * Componente principal do jogo.
 * @param transport - Instância de transporte para comunicação com o servidor.
 * @returns Componente React representando o jogo.
 */
export function PongApp({ transport }: { transport: Transport }) {
  const state = useMatchState(transport);
  usePaddleInput(transport, {
    enabled: state.phase === "playing" && state.snapshot.winner === null,
  });

  return (
    <Box sx={{ height: "100%", width: "100%", minHeight: 0 }}>
      <PhaseView
        state={state}
        onRequestRematch={() => transport.requestRematch()}
        onRequestResume={() => transport.requestResume()}
        onRequestLeave={() => transport.requestLeave()}
      />
    </Box>
  );
}
