import type { WebSocketTransport } from "../transports/pong/WebSocketTransport";

/** Legal document displayed on the public page. */
export type LegalPageProps = { document: "privacy" | "terms" };

/** Props for the Pong page layout. */
export type PongLayoutProps = { transport: WebSocketTransport };

/** Props for the frame containing the game. */
export type PongBoardProps = PongLayoutProps;
