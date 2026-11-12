import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import { PongApp } from "../games/pong/view/PongApp";
import { WebSocketTransport } from "../transports/pong/WebSocketTransport";
import type { PongBoardProps, PongLayoutProps } from "./pageProps";

/**
 * Pong page.
 * Renders the game interface and manages the communication transport.
 */
export function PongPage() {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("inviteId");
  const transport = useMemo(
    () => new WebSocketTransport(invitationId),
    [invitationId],
  );
  useEffect(() => () => transport.disconnect(), [transport]);
  return <PongLayout transport={transport} />;
}

/** Arranges the area occupied by the game. */
function PongLayout({ transport }: PongLayoutProps) {
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

/** Renders the frame containing Pong. */
function PongBoard({ transport }: PongBoardProps) {
  return (
    <Box
      sx={{ minHeight: 0, flex: 1, bgcolor: "background.default" }}
      aria-label="Área do jogo"
    >
      <PongApp transport={transport} />
    </Box>
  );
}
