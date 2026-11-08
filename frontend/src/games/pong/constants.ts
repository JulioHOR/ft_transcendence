import type { MatchState } from "./protocol";
import { TABLE } from "./protocol";

/** Lados possíveis da mesa usados para carregar e exibir jogadores. */
export const GAME_SIDES = ["left", "right"] as const;

/** Títulos das fases que não possuem uma tela específica. */
export const BASIC_PHASE_TITLES: Partial<Record<MatchState["phase"], string>> = {
  connecting: "Conectando…",
  waiting: "Aguardando oponente",
  opponent_left: "Partida encerrada",
};

/** Parâmetros fixos usados para enquadrar a mesa na câmera. */
export const PONG_CAMERA = {
  viewHalfX: TABLE.halfLength * 1.2,
  viewHalfZ: TABLE.halfWidth * 1.35,
  margin: 1.1,
  fov: 45,
  maxFov: 54,
  wideAspectStart: 1.2,
  wideFovStep: 5,
  elevation: 0.84,
  depth: 0.64,
} as const;

/** Camada de placar e instruções sobre a cena 3D. */
export const PONG_STAGE_OVERLAY_SX = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  alignItems: "center",
  justifyContent: "space-between",
  px: 1,
  pt: { xs: 5, sm: 6 },
  pb: { xs: 3, sm: 4 },
  pointerEvents: "none",
} as const;

/** Área reservada para manter o placar acima da mesa em qualquer viewport. */
export const PONG_CANVAS_SX = {
  position: "absolute",
  inset: 0,
  top: { xs: 220, sm: 236 },
  bottom: { xs: 48, sm: 56 },
} as const;

/** Fundo comum dos estados exibidos sobre a mesa. */
export const PONG_MODAL_BACKDROP_SX = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  alignItems: "center",
  justifyContent: "center",
  p: 2,
  bgcolor: "rgba(3, 10, 18, 0.68)",
  backdropFilter: "blur(2px)",
} as const;

/** Cartão específico do modal de pausa. */
export const RESUME_CARD_SX = {
  width: "min(100%, 440px)",
  borderColor: "primary.main",
  bgcolor: "rgba(10, 24, 37, 0.96)",
  color: "common.white",
  p: { xs: 2.5, sm: 4 },
} as const;

/** Posição vertical da superfície da mesa no mundo 3D. */
export const TABLE_SURFACE_Y = -0.5;

/** Dimensões e acabamento visual da mesa e dos seus elementos. */
export const PADDLE_SIZE: [number, number, number] = [0.18, 0.24, 1.6];
export const PADDLE_Y = TABLE_SURFACE_Y + PADDLE_SIZE[1] / 2;
export const BALL_Y = TABLE_SURFACE_Y + TABLE.ballRadius;
export const TABLE_LENGTH = TABLE.halfLength * 2;
export const TABLE_WIDTH = TABLE.halfWidth * 2;
export const TABLE_RAIL_HEIGHT = 0.32;
export const TRAIL_LENGTH = 16;
export const TRAIL_FULL_SPEED = 0.6;
export const TRAIL_MIN_SPEED = TRAIL_FULL_SPEED * 0.4;
export const TABLE_EDGE_COLOR = "#754a2c";
export const TABLE_COLOR = "#1c5a46";
export const TABLE_MARKING_COLOR = "#f0e2c4";
export const NET_COLOR = "#263b34";
export const LEFT_PADDLE_COLOR = "#4af";
export const RIGHT_PADDLE_COLOR = "#f4a";
export const BALL_COLOR = "#fff8e7";
export const BALL_TRAIL_COLOR = "#f0c674";
export const GLOW_INTENSITY = 0.15;
export const SUPPORT_COLOR = "#3a2a23";
export const EDGE_GLOW_COLOR = "#d89a58";

type TableBox = {
  position: [number, number, number];
  size: [number, number, number];
};

/** Trilhos estruturais que contornam a superfície da mesa. */
export const TABLE_RAILS: TableBox[] = [
  {
    position: [0, TABLE_SURFACE_Y + TABLE_RAIL_HEIGHT / 2, -TABLE.halfWidth - 0.1],
    size: [TABLE_LENGTH + 0.4, TABLE_RAIL_HEIGHT, 0.2],
  },
  {
    position: [0, TABLE_SURFACE_Y + TABLE_RAIL_HEIGHT / 2, TABLE.halfWidth + 0.1],
    size: [TABLE_LENGTH + 0.4, TABLE_RAIL_HEIGHT, 0.2],
  },
  {
    position: [-TABLE.halfLength - 0.1, TABLE_SURFACE_Y + TABLE_RAIL_HEIGHT / 2, 0],
    size: [0.2, TABLE_RAIL_HEIGHT, TABLE_WIDTH],
  },
  {
    position: [TABLE.halfLength + 0.1, TABLE_SURFACE_Y + TABLE_RAIL_HEIGHT / 2, 0],
    size: [0.2, TABLE_RAIL_HEIGHT, TABLE_WIDTH],
  },
];

/** Linhas luminosas decorativas aplicadas junto às bordas da mesa. */
export const TABLE_EDGE_LINES: TableBox[] = [
  {
    position: [0, TABLE_SURFACE_Y + 0.02, -TABLE.halfWidth + 0.08],
    size: [TABLE_LENGTH - 0.25, 0.02, 0.025],
  },
  {
    position: [0, TABLE_SURFACE_Y + 0.02, TABLE.halfWidth - 0.08],
    size: [TABLE_LENGTH - 0.25, 0.02, 0.025],
  },
  {
    position: [-TABLE.halfLength + 0.08, TABLE_SURFACE_Y + 0.02, 0],
    size: [0.025, 0.02, TABLE_WIDTH - 0.25],
  },
  {
    position: [TABLE.halfLength - 0.08, TABLE_SURFACE_Y + 0.02, 0],
    size: [0.025, 0.02, TABLE_WIDTH - 0.25],
  },
];

/** Velocidade local usada para mover a raquete. */
export const PADDLE_SPEED = 8;

/** Teclas aceitas para mover a raquete para cima e para baixo. */
export const MOVE_UP_CODES = new Set(["KeyW", "ArrowUp"]);
export const MOVE_DOWN_CODES = new Set(["KeyS", "ArrowDown"]);

/** Quantidade de registros exibidos inicialmente nas tabelas de estatísticas. */
export const PONG_STATS_PAGE_SIZE = 7;
