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
import { ui } from "../../../ui/classes";

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

/** Enquadra a mesa na área visível do canvas. */
function FitTableCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;

    const aspect = size.width / Math.max(size.height, 1);
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

function PhaseView({
  state,
  onRequestRematch,
}: {
  state: MatchState;
  onRequestRematch: () => void;
}): ReactNode {
  switch (state.phase) {
    case "connecting":
      return <StatusScreen title="Conectando…" />;
    case "waiting":
      return (
        <StatusScreen title="Aguardando oponente">
          <p className={ui.muted}>Espere outra pessoa entrar.</p>
        </StatusScreen>
      );
    case "countdown":
      return <CountdownScreen you={state.you} startsAt={state.startsAt} />;
    case "playing":
      return <PongStage snapshot={state.snapshot} />;
    case "finished":
      return (
        <ResultScreen
          you={state.you}
          winner={state.snapshot.winner}
          score={state.snapshot.score}
          rematchAccepted={state.rematchAccepted}
          onRequestRematch={onRequestRematch}
        />
      );
    case "opponent_left":
      return <StatusScreen title="Oponente saiu" />;
    case "error":
      return (
        <StatusScreen title="Algo deu errado">
          <p className={ui.muted}>{state.errorMessage ?? "Tente novamente."}</p>
        </StatusScreen>
      );
  }
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
