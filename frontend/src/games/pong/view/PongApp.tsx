import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { PongScene } from "./PongScene";
import { usePaddleInput } from "./usePaddleInput";
import {
  CountdownScreen,
  ResultScreen,
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
  const verticalDistance =
    verticalHalfSize / Math.tan(verticalFov / 2);

  const horizontalDistance =
    horizontalHalfSize / Math.tan(horizontalFov / 2);

  const requiredDistance = Math.max(
    verticalDistance,
    horizontalDistance,
  );

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
  const distance = calculateCameraDistance(VIEW_HALF_Z, VIEW_HALF_X, vFov, hFov);
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
    <div className="relative h-full w-full min-h-0">
      <div
        className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center font-mono text-xl sm:text-2xl"
        aria-live="polite"
      >
        {snapshot.score.left} — {snapshot.score.right}
      </div>
      <div className="absolute inset-0">
        <Canvas camera={{ fov: 45, near: 0.1, far: 200 }}>
          <FitTableCamera />
          <PongScene snapshot={snapshot} />
        </Canvas>
      </div>
    </div>
  );
}

/** Propriedades da fase atual da partida. */
type PhaseViewProps = {
  state: MatchState;
  onRequestRematch: () => void;
};

/**
 * Renderiza a visualização da fase atual da partida,
 * exibindo a tela apropriada com base no estado do jogo.
 * @param state - Estado atual da partida.
 * @param onRequestRematch - Função chamada quando o jogador solicita um rematch.
 * @returns Componente React representando a fase atual da partida.
 */
function PhaseView({ state, onRequestRematch }: PhaseViewProps): ReactNode {
  switch (state.phase) {
    case "connecting": return <StatusScreen title="Conectando…" />;
    case "waiting": return <StatusScreen title="Aguardando oponente" />;
    case "countdown": return (
      <CountdownScreen
        playerSide={state.playerSide}
        startsAt={state.startsAt}
      />
    );
    case "playing": return <PongStage snapshot={state.snapshot} />;
    case "finished": return <ResultScreen state={state} onRequestRematch={onRequestRematch} />;
    case "opponent_left": return <StatusScreen title="Oponente saiu" />;
    default: return <StatusScreen title={state.errorMessage ?? "Algo deu errado"} />;
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
    <div className="h-full w-full min-h-0">
      <PhaseView
        state={state}
        onRequestRematch={() => transport.requestRematch()}
      />
    </div>
  );
}
