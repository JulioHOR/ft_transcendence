import { useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { PongScene } from "./PongScene";
import { usePaddleInput } from "./usePaddleInput";
import {
  CountdownScreen,
  ResultScreen,
  StatusScreen,
} from "./MatchScreens";
import type { GameSnapshot, MatchState, Transport } from "../protocol";
import { createInitialMatchState } from "../protocol";
import { ui } from "../../../ui/classes";

function useMatchState(transport: Transport): MatchState {
  const [state, setState] = useState(createInitialMatchState);

  useEffect(() => {
    transport.onState(setState);
    void transport.connect();
    return () => transport.disconnect();
  }, [transport]);

  return state;
}

function PongStage({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <div className="relative h-full w-full">
      <div
        className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center font-mono text-xl sm:text-2xl"
        aria-live="polite"
      >
        {snapshot.score.left} — {snapshot.score.right}
      </div>
      <Canvas camera={{ position: [0, 14, 14], fov: 45 }}>
        <PongScene snapshot={snapshot} />
      </Canvas>
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
          <p className={ui.muted}>Espere outro jogador entrar na fila.</p>
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
        <StatusScreen title="Erro">
          <p className={ui.muted}>{state.errorMessage ?? "Erro na partida."}</p>
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
    <PhaseView
      state={state}
      onRequestRematch={() => transport.requestRematch()}
    />
  );
}
