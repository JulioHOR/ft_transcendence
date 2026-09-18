import { useEffect, useMemo } from "react";
import { PongApp } from "../games/pong/view/PongApp";
import { WebSocketTransport } from "../transports/pong/WebSocketTransport";
export function PongPage() {
  const transport = useMemo(() => new WebSocketTransport(), []);
  useEffect(() => () => transport.disconnect(), [transport]);
  return (
    <div>
      <h1>Pong</h1>
      <div style={{ width: "100%", height: "480px", background: "#111" }}>
        <PongApp transport={transport} />
      </div>
    </div>
  );
}
