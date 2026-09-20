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

const VIEW_HALF_X = TABLE.halfLength * 1.2;
const VIEW_HALF_Z = TABLE.halfWidth * 1.35;

function useMatchState(transport: Transport): MatchState {
  const [state, setState] = useState(createInitialMatchState);

  useEffect(() => {
    transport.onState(setState);
    void transport.connect();
    return () => transport.disconnect();
  }, [transport]);

  return state;
}

function frameTableCamera(
  camera: PerspectiveCamera,
  width: number,
  height: number,
): void {
  const aspect = width / Math.max(height, 1);
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance =
    Math.max(VIEW_HALF_Z / Math.tan(vFov / 2), VIEW_HALF_X / Math.tan(hFov / 2)) *
    1.2;
  camera.position.set(0, distance * 0.72, distance * 0.72);
  camera.lookAt(0, 0, 0);
  camera.near = 0.1;
  camera.far = distance * 5;
  camera.updateProjectionMatrix();
}

function FitTableCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    frameTableCamera(camera, size.width, size.height);
  }, [camera, size.width, size.height]);

  return null;
}

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

type PhaseViewProps = {
  state: MatchState;
  onRequestRematch: () => void;
};

function PhaseView({ state, onRequestRematch }: PhaseViewProps): ReactNode {
  if (state.phase === "connecting") return <StatusScreen title="Conectando…" />;
  if (state.phase === "waiting") return <StatusScreen title="Aguardando oponente" />;
  if (state.phase === "countdown") {
    return <CountdownScreen playerSide={state.playerSide} startsAt={state.startsAt} />;
  }
  if (state.phase === "playing") return <PongStage snapshot={state.snapshot} />;
  if (state.phase === "finished") {
    return <ResultScreen state={state} onRequestRematch={onRequestRematch} />;
  }
  if (state.phase === "opponent_left") return <StatusScreen title="Oponente saiu" />;
  return <StatusScreen title={state.errorMessage ?? "Algo deu errado"} />;
}

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
