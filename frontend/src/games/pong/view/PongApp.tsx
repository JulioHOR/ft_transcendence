import { useEffect, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { PongScene } from "./PongScene";
import { usePaddleInput } from "./usePaddleInput";
import { POINTS_TO_WIN } from "../protocol";
import type { Transport, GameSnapshot, Side } from "../protocol";

const INITIAL_SNAPSHOT: GameSnapshot = {
  leftPaddleOffset: 0,
  rightPaddleOffset: 0,
  ball: { x: 0, z: 0 },
  score: { left: 0, right: 0 },
  winner: null,
  timestamp: 0,
};

const SCORE_STYLE: CSSProperties = {
  position: "absolute",
  top: 12,
  left: 0,
  right: 0,
  zIndex: 1,
  textAlign: "center",
  color: "#fff",
  fontSize: 28,
  fontFamily: "monospace",
  pointerEvents: "none",
};

const OVERLAY_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  background: "rgba(0, 0, 0, 0.65)",
  color: "#fff",
  fontFamily: "monospace",
};

const RESTART_BUTTON_STYLE: CSSProperties = {
  padding: "10px 20px",
  fontSize: 16,
  fontFamily: "monospace",
  cursor: "pointer",
  border: "1px solid #fff",
  background: "transparent",
  color: "#fff",
};

/** Exibe o placar da partida. */
function ScoreBoard({ left, right }: { left: number; right: number }) {
  return (
    <div style={SCORE_STYLE}>
      {left} — {right}
    </div>
  );
}

/** Retorna o texto exibido ao fim da partida. */
function getWinnerLabel(winner: Side): string {
  return winner === "left" ? "You win" : "Opponent wins";
}

/** Overlay de fim de partida com opção de reiniciar. */
function MatchOverOverlay({
  winner,
  onRestart,
}: {
  winner: Side;
  onRestart: () => void;
}) {
  return (
    <div style={OVERLAY_STYLE}>
      <div style={{ fontSize: 32 }}>{getWinnerLabel(winner)}</div>
      <div style={{ fontSize: 14, opacity: 0.8 }}>First to {POINTS_TO_WIN}</div>
      <button type="button" style={RESTART_BUTTON_STYLE} onClick={onRestart}>
        Play again
      </button>
    </div>
  );
}

/**
 * Conecta ao transport, mantém o snapshot atualizado e desconecta no unmount.
 *
 * @param transport - Canal de comunicação da partida
 */
function usePongSnapshot(transport: Transport): GameSnapshot {
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  useEffect(() => {
    transport.onSnapshot(setSnapshot);
    void transport.connect();
    return () => transport.disconnect();
  }, [transport]);

  return snapshot;
}

/** Placar e overlay de fim de partida. */
function MatchHud({
  snapshot,
  onRestart,
}: {
  snapshot: GameSnapshot;
  onRestart: () => void;
}) {
  return (
    <>
      <ScoreBoard left={snapshot.score.left} right={snapshot.score.right} />
      {snapshot.winner !== null && (
        <MatchOverOverlay winner={snapshot.winner} onRestart={onRestart} />
      )}
    </>
  );
}

/** Área do jogo: HUD + canvas 3D. */
function PongStage({
  snapshot,
  transport,
}: {
  snapshot: GameSnapshot;
  transport: Transport;
}) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MatchHud snapshot={snapshot} onRestart={() => transport.restart()} />
      <Canvas camera={{ position: [0, 14, 14], fov: 45 }}>
        <PongScene snapshot={snapshot} />
      </Canvas>
    </div>
  );
}

/**
 * Aplicação do Pong: recebe o transport, lê o estado e desenha a partida.
 *
 * @param transport - Canal de comunicação da partida
 */
export function PongApp({ transport }: { transport: Transport }) {
  const snapshot = usePongSnapshot(transport);
  usePaddleInput(transport, { enabled: snapshot.winner === null });
  return <PongStage snapshot={snapshot} transport={transport} />;
}
