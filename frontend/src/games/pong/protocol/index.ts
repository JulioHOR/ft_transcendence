export type {
  Side,
  PaddleInput,
  GameSnapshot,
  Transport,
  MatchPhase,
  MatchState,
  PlayerIds,
  AcceptanceBySide,
} from "./types";
export { EMPTY_SNAPSHOT, createInitialMatchState } from "./types";
export { TABLE, POINTS_TO_WIN, getPaddleX, inputLimit } from "./table";
