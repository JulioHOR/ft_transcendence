import { useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import { PongApp } from "../games/pong/view/PongApp";
import { WebSocketTransport } from "../transports/pong/WebSocketTransport";

/**
 * Página do Pong.
 * Renderiza a interface do jogo e gerencia o transporte de comunicação.
 */
export function PongPage() {
  const transport = useMemo(() => new WebSocketTransport(), []);
  useEffect(() => () => transport.disconnect(), [transport]);
  return <PongLayout transport={transport} />;
}

function PongLayout({ transport }: { transport: WebSocketTransport }) {
  return (
    <Box
      component="section"
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
      }}
    >
      <PongBoard transport={transport} />
    </Box>
  );
}

function PongBoard({ transport }: { transport: WebSocketTransport }) {
  return (
    <Box
      sx={{ minHeight: 0, flex: 1, bgcolor: "#080d0b" }}
      aria-label="Área do jogo"
    >
      <PongApp transport={transport} />
    </Box>
  );
}
