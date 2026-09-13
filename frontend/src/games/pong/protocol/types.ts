export type Side = "left" | "right";

export type PaddleInput = {
  offset: number;
  sequence: number;
};

export type GameSnapshot = {
  leftPaddleOffset: number;
  rightPaddleOffset: number;
  ball: { x: number; z: number };
  score: { left: number; right: number };
  winner: Side | null;
  timestamp: number;
};

export interface Transport {
  connect(): Promise<void>;
  disconnect(): void;
  restart(): void;
  sendInput(input: PaddleInput): void;
  onSnapshot(listener: (snapshot: GameSnapshot) => void): void;
}
