import { useMemo } from "react";
import { PongApp } from "../games/pong/PongApp";
import { createMockTransport } from "../games/pong/transport/mockTransport";

export function PongPage() {
  const transport = useMemo(() => createMockTransport(), []);

  return (
    <div>
      <h1>Pong</h1>
      <div style={{ width: "100%", height: "480px", background: "#111" }}>
        <PongApp transport={transport} />
      </div>
    </div>
  );
}
