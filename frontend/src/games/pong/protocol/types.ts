/** Table side occupied by a player. */
export type Side = "left" | "right";

/** Player IDs associated with the table sides. */
export type PlayerIds = Record<Side, number | null>;

/** Represents player input for controlling the paddle. */
export type PaddleInput = {
  /** Paddle position on the table. */
  position: number;
};

/**
 * Represents the game state at a given moment.
 * Contains paddle positions, ball position, score, and winner information.
 */
export type GameSnapshot = {
  leftPaddlePosition: number;
  rightPaddlePosition: number;
  ball: { x: number; z: number };
  score: { left: number; right: number };
  winner: Side | null;
  serveSide: Side | null;
  timestamp: number;
};

/** Represents the current match state. */
export type MatchPhase =
  | "connecting"
  | "waiting"
  | "countdown"
  | "playing"
  | "finished"
  | "resume_pending"
  | "opponent_left"
  | "opponent_disconnected"
  | "error";

/** Indicates each side's confirmation status. */
export type AcceptanceBySide = { left: boolean; right: boolean };

/**
 * Represents the current state of a Pong match.
 * Contains the game phase, player side, countdown state,
 * rematch state, game snapshot, and error messages.
 */
export type MatchState = {
  /** Current match phase (connecting, waiting, countdown, playing, finished, opponent left, or error). */
  phase: MatchPhase;
  /** Current player's side (left or right). */
  playerSide: Side | null;
  /** Player IDs on each side of the table. */
  playerIds: PlayerIds;
  /** Indicates when the game countdown began. */
  startsAt: number | null;
  /** Indicates whether the player accepted the rematch. */
  rematchAccepted: AcceptanceBySide;
  /** Indicates whether each side accepted resuming the match. */
  resumeAccepted: AcceptanceBySide;
  /** Current game snapshot, containing paddle positions, ball position, score, and winner information. */
  snapshot: GameSnapshot;
  /** Error message in case a problem occurs during the match. */
  errorMessage: string | null;
};

export const EMPTY_SNAPSHOT: GameSnapshot = {
  leftPaddlePosition: 0,
  rightPaddlePosition: 0,
  ball: { x: 0, z: 0 },
  score: { left: 0, right: 0 },
  winner: null,
  serveSide: null,
  timestamp: 0,
};

/** Creates the initial state for a match. */
export function createInitialMatchState(): MatchState {
  return {
    phase: "connecting",
    playerSide: null,
    playerIds: { left: null, right: null },
    startsAt: null,
    rematchAccepted: { left: false, right: false },
    resumeAccepted: { left: false, right: false },
    snapshot: EMPTY_SNAPSHOT,
    errorMessage: null,
  };
}

/** Interface for the match data transport. */
export interface Transport {
  /** Connects to the server. */
  connect(): Promise<void>;
  /** Disconnects from the server. */
  disconnect(): void;
  /** Requests a rematch. */
  requestRematch(): void;
  /** Accepts resuming a paused match. */
  requestResume(): void;
  /** Ends a finished match and releases the players from matchmaking. */
  requestLeave(): void;
  /** Sends player input. */
  sendInput(input: PaddleInput): void;
  /** Requests a serve when the ball is attached to the paddle. */
  requestServe(): void;
  /** Registers a listener for state updates. */
  onState(listener: (state: MatchState) => void): void;
}
