import { useEffect, useMemo } from "react";
import { PongApp } from "../games/pong/view/PongApp";
import { WebSocketTransport } from "../transports/pong/WebSocketTransport";
import { ui } from "../ui/classes";

export function PongPage() {
  const transport = useMemo(() => new WebSocketTransport(), []);
  useEffect(() => () => transport.disconnect(), [transport]);

  return (
    <section className={ui.page}>
      <header className={ui.bar}>
        <h1 className={ui.title}>Pong</h1>
      </header>
      <div className="min-h-0 flex-1 bg-zinc-950" aria-label="Área do jogo">
        <PongApp transport={transport} />
      </div>
    </section>
  );
}
