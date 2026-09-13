/**
 * Lado da mesa.
 * `left` = jogador, `right` = oponente.
 */
export type Side = "left" | "right";

/**
 * Input de paddle enviado pelo cliente ao servidor.
 */
export type PaddleInput = {
  /**
   * Posição da paddle no eixo Z (largura da mesa).
   * Centro = 0.
   */
  offset: number;
  /** Número sequencial do input, crescente a cada envio. */
  sequence: number;
};

/**
 * Estado da partida enviado pelo servidor ao cliente para renderização.
 * Eixos iguais aos da TABLE: X = comprimento, Z = largura.
 */
export type GameSnapshot = {
  /** Posição da paddle esquerda no eixo Z (largura). */
  leftPaddleOffset: number;
  /** Posição da paddle direita no eixo Z (largura). */
  rightPaddleOffset: number;
  /** Posição da bola: `x` no comprimento, `z` na largura. */
  ball: { x: number; z: number };
  score: { left: number; right: number };
  /** Vencedor da partida, ou `null` se ainda em andamento. */
  winner: Side | null;
  timestamp: number;
};

/**
 * Contrato de comunicação da partida entre cliente e servidor.
 */
export interface Transport {
  /** Inicia a conexão / sessão da partida. */
  connect(): Promise<void>;
  /** Encerra a conexão / sessão da partida. */
  disconnect(): void;
  /** Reinicia placar e posições para uma nova partida. */
  restart(): void;
  /** Envia a posição atual da paddle do jogador. */
  sendInput(input: PaddleInput): void;
  /** Define o callback chamado a cada novo estado da partida. */
  onSnapshot(listener: (snapshot: GameSnapshot) => void): void;
}
