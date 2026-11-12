import type { MutableRefObject, ReactNode } from "react";
import type { Profile } from "../../../api/types";
import type { GameSnapshot, MatchState, Side, Transport } from "../protocol";

/** Minimal profile used in the match scoreboard. */
export type PlayerProfile = Pick<Profile, "nickname" | "avatarUrl">;

/** Profiles associated with the table sides. */
export type PlayerProfiles = Record<Side, PlayerProfile | null>;

/** Props for the status screen overlaid on the game. */
export type StatusScreenProps = {
  title: string;
  titleColor?: string;
  children?: ReactNode;
};

/** Props for the match countdown. */
export type CountdownScreenProps = {
  playerSide: Side | null;
  startsAt: number | null;
};

/** Props for the number displayed in the countdown. */
export type CountdownNumberProps = { seconds: number };

/** Props for the rematch button. */
export type RematchButtonProps = {
  accepted: boolean;
  onRequestRematch: () => void;
};

/** Props for the actions displayed at the end of the match. */
export type ResultActionsProps = {
  accepted: boolean;
  onRequestRematch: () => void;
  onRequestLeave: () => void;
};

/** Props for the button that ends the match. */
export type LeaveMatchButtonProps = {
  onLeave: () => void;
  equalWidth?: boolean;
};

/** Props for the result screen. */
export type ResultScreenProps = {
  state: MatchState;
  onRequestRematch: () => void;
  onRequestLeave: () => void;
};

/** Props for the result details. */
export type ResultDetailsProps = { state: MatchState };

/** Props for an individual score. */
export type ScorePlayerProps = { label: string; score: number };

/** State of the confirmation indicators. */
export type AcceptanceFlags = {
  playerAccepted: boolean;
  opponentAccepted: boolean;
};

/** Props for the confirmation indicators. */
export type AcceptanceStatusProps = {
  flags: AcceptanceFlags;
  pendingLabel?: string;
};

/** Props for an individual confirmation indicator. */
export type ConfirmationChipProps = {
  accepted: boolean;
  label: string;
};

/** Props for the resume modal. */
export type ResumeScreenProps = {
  state: MatchState;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Props for the resume modal actions. */
export type ResumeActionsProps = {
  flags: AcceptanceFlags;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Props for the 3D stage and its visual controls. */
export type PongStageProps = {
  snapshot: GameSnapshot;
  playerSide: MatchState["playerSide"];
  profiles: PlayerProfiles;
  phase: MatchState["phase"];
};

/** Props for the Canvas that renders the table. */
export type PongCanvasProps = { snapshot: GameSnapshot };

/** Props for the status panel that keeps the game in the background. */
export type PhaseStageProps = {
  children: ReactNode;
};

/** Props for the card containing the match states. */
export type PhaseBackdropProps = { children: ReactNode };

/** Props for the scoreboard panel content. */
export type PlayerScoreboardProps = {
  score: GameSnapshot["score"];
  profiles: PlayerProfiles;
  phase: MatchState["phase"];
};

/** Props for a player's scoreboard card. */
export type PlayerScoreCardProps = {
  side: Side;
  profile: PlayerProfile | null;
  score: number;
  phase: MatchState["phase"];
};

/** Props for selecting the match phase. */
export type PhaseViewProps = {
  state: MatchState;
  profiles: PlayerProfiles;
  onRequestRematch: () => void;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Props for the basic match phase. */
export type BasicPhaseViewProps = {
  state: MatchState;
  profiles: PlayerProfiles;
};

/** Props for the in-progress phase. */
export type PlayingPhaseProps = BasicPhaseViewProps;

/** Props for a phase with a status message. */
export type StatusPhaseProps = BasicPhaseViewProps & { title: string };

/** Props for the countdown phase. */
export type CountdownPhaseProps = BasicPhaseViewProps;

/** Props for the main game component. */
export type PongAppProps = { transport: Transport };

/** Props for a table rail. */
export type TableRailProps = {
  position: [number, number, number];
  size: [number, number, number];
};

/** Props for a paddle. */
export type PaddleProps = { side: Side; position: number };

/** Point used in the ball trail. */
export type BallPoint = { x: number; z: number };

/** Visual state of the ball impact. */
export type Impact = { strength: number; angle: number };

/** Props for the ball trail. */
export type BallTrailProps = { trail: BallPoint[]; speed: number };

/** Props for a trail point. */
export type TrailPointProps = {
  point: BallPoint;
  index: number;
  speedFactor: number;
  color: string;
};

/** Props for the visual impact effect. */
export type ImpactFlashProps = {
  impact: MutableRefObject<Impact>;
};

/** Props for the visual ball component. */
export type BallProps = { snapshot: GameSnapshot };

/** Props for the visual ball body. */
export type BallBodyProps = {
  snapshot: GameSnapshot;
  impact?: MutableRefObject<Impact>;
};

/** Props for the complete Pong scene. */
export type PongSceneProps = { snapshot: GameSnapshot };

/** Options for the paddle input hook. */
export type UsePaddleInputOptions = {
  enabled: boolean;
  paddlePosition: number;
};
