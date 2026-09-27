export type Side = "left" | "right";

/** Representa a entrada do jogador para controlar a raquete. */
export type PaddleInput = {
  /** A posição da raquete na mesa. */
  position: number;
};

/**
 * Representa o estado do jogo em um determinado momento.
 * Contém informações sobre a posição das raquetes, bola, pontuação e vencedor.
 */
export type GameSnapshot = {
  leftPaddlePosition: number;
  rightPaddlePosition: number;
  ball: { x: number; z: number };
  score: { left: number; right: number };
  winner: Side | null;
  timestamp: number;
};

/** Representa o estado atual da partida. */
export type MatchPhase =
  | "connecting"
  | "waiting"
  | "countdown"
  | "playing"
  | "finished"
  | "opponent_left"
  | "error";

export type RematchAccepted = { left: boolean; right: boolean };

/**
 * Representa o estado atual de uma partida de Pong.
 * Contém informações sobre a fase do jogo, o lado do jogador, o estado da contagem regressiva,
 * o estado do rematch, o snapshot do jogo e mensagens de erro.
 */
export type MatchState = {
  /** Fase atual da partida (conectando, esperando, contagem regressiva, jogando, finalizado, adversário saiu ou erro). */
  phase: MatchPhase;
  /** Lado atual do jogador (esquerdo ou direito). */
  playerSide: Side | null;
  /** Indica o momento em que a contagem regressiva do jogo começou. */
  startsAt: number | null;
  /** Indica se o jogador aceitou o rematch. */
  rematchAccepted: RematchAccepted;
  /** Snapshot atual do jogo, contendo informações sobre a posição das raquetes, bola, pontuação e vencedor. */
  snapshot: GameSnapshot;
  /** Mensagem de erro, em caso de algum problema durante a partida. */
  errorMessage: string | null;
};

export const EMPTY_SNAPSHOT: GameSnapshot = {
  leftPaddlePosition: 0,
  rightPaddlePosition: 0,
  ball: { x: 0, z: 0 },
  score: { left: 0, right: 0 },
  winner: null,
  timestamp: 0,
};

/** Cria o estado inicial de uma partida. */
export function createInitialMatchState(): MatchState {
  return {
    phase: "connecting",
    playerSide: null,
    startsAt: null,
    rematchAccepted: { left: false, right: false },
    snapshot: EMPTY_SNAPSHOT,
    errorMessage: null,
  };
}

/** Interface para o transporte de dados da partida. */
export interface Transport {
  /** Conecta ao servidor. */
  connect(): Promise<void>;
  /** Desconecta do servidor. */
  disconnect(): void;
  /** Solicita um rematch. */
  requestRematch(): void;
  /** Envia a entrada do jogador. */
  sendInput(input: PaddleInput): void;
  /** Registra um listener para atualizações de estado. */
  onState(listener: (state: MatchState) => void): void;
}
