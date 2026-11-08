import type { WebSocketTransport } from "../transports/pong/WebSocketTransport";

/** Documento legal exibido na página pública. */
export type LegalPageProps = { document: "privacy" | "terms" };

/** Props do layout da página do Pong. */
export type PongLayoutProps = { transport: WebSocketTransport };

/** Props do quadro que contém o jogo. */
export type PongBoardProps = PongLayoutProps;
