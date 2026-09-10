import { useEffect, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { PongScene } from "./PongScene";
import { usePaddleInput } from "./usePaddleInput";
import { POINTS_TO_WIN } from "./simulation";
import type { Transport, GameSnapshot, Side } from "./transport/types";

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

function ScoreBoard({ left, right }: { left: number; right: number }) {
  return (
    <div style={SCORE_STYLE}>
      {left} — {right}
    </div>
  );
}

function getWinnerLabel(winner: Side): string {
  return winner === "left" ? "You win" : "Opponent wins";
}

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

function usePongSnapshot(transport: Transport): GameSnapshot {
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  useEffect(() => {
    transport.onSnapshot(setSnapshot);
    void transport.connect();
    return () => transport.disconnect();
  }, [transport]);

  return snapshot;
}

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

export function PongApp({ transport }: { transport: Transport }) {
  const snapshot = usePongSnapshot(transport);
  usePaddleInput(transport, { enabled: snapshot.winner === null });
  return <PongStage snapshot={snapshot} transport={transport} />;
}
