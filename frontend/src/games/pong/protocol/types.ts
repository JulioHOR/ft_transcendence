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

export type MatchPhase =
  | "connecting"
  | "waiting"
  | "countdown"
  | "playing"
  | "finished"
  | "opponent_left"
  | "error";

export type RematchAccepted = { left: boolean; right: boolean };

export type MatchState = {
  phase: MatchPhase;
  you: Side | null;
  startsAt: number | null;
  rematchAccepted: RematchAccepted;
  snapshot: GameSnapshot;
  errorMessage: string | null;
};

export const EMPTY_SNAPSHOT: GameSnapshot = {
  leftPaddleOffset: 0,
  rightPaddleOffset: 0,
  ball: { x: 0, z: 0 },
  score: { left: 0, right: 0 },
  winner: null,
  timestamp: 0,
};

export function createInitialMatchState(): MatchState {
  return {
    phase: "connecting",
    you: null,
    startsAt: null,
    rematchAccepted: { left: false, right: false },
    snapshot: EMPTY_SNAPSHOT,
    errorMessage: null,
  };
}

export interface Transport {
  connect(): Promise<void>;
  disconnect(): void;
  requestRematch(): void;
  sendInput(input: PaddleInput): void;
  onState(listener: (state: MatchState) => void): void;
}
