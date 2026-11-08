import type { MutableRefObject, ReactNode } from "react";
import type { Profile } from "../../../api/types";
import type { GameSnapshot, MatchState, Side, Transport } from "../protocol";

/** Perfil mínimo usado no placar da partida. */
export type PlayerProfile = Pick<Profile, "nickname" | "avatarUrl">;

/** Perfis associados aos lados da mesa. */
export type PlayerProfiles = Record<Side, PlayerProfile | null>;

/** Props da tela de estado sobreposta ao jogo. */
export type StatusScreenProps = {
  title: string;
  titleColor?: string;
  children?: ReactNode;
};

/** Props da contagem regressiva da partida. */
export type CountdownScreenProps = {
  playerSide: Side | null;
  startsAt: number | null;
};

/** Props do número exibido na contagem regressiva. */
export type CountdownNumberProps = { seconds: number };

/** Props do botão de rematch. */
export type RematchButtonProps = {
  accepted: boolean;
  onRequestRematch: () => void;
};

/** Props das ações exibidas ao final da partida. */
export type ResultActionsProps = {
  accepted: boolean;
  onRequestRematch: () => void;
  onRequestLeave: () => void;
};

/** Props do botão que encerra a partida. */
export type LeaveMatchButtonProps = {
  onLeave: () => void;
  equalWidth?: boolean;
};

/** Props da tela de resultado. */
export type ResultScreenProps = {
  state: MatchState;
  onRequestRematch: () => void;
  onRequestLeave: () => void;
};

/** Props dos detalhes do resultado. */
export type ResultDetailsProps = { state: MatchState };

/** Props de uma pontuação individual. */
export type ScorePlayerProps = { label: string; score: number };

/** Estado dos indicadores de confirmação. */
export type AcceptanceFlags = {
  playerAccepted: boolean;
  opponentAccepted: boolean;
};

/** Props dos indicadores de confirmação. */
export type AcceptanceStatusProps = {
  flags: AcceptanceFlags;
  pendingLabel?: string;
};

/** Props de um indicador individual de confirmação. */
export type ConfirmationChipProps = {
  accepted: boolean;
  label: string;
};

/** Props do modal de retomada. */
export type ResumeScreenProps = {
  state: MatchState;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Props das ações do modal de retomada. */
export type ResumeActionsProps = {
  flags: AcceptanceFlags;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Props do palco 3D e seus controles visuais. */
export type PongStageProps = {
  snapshot: GameSnapshot;
  playerSide: MatchState["playerSide"];
  profiles: PlayerProfiles;
  phase: MatchState["phase"];
};

/** Props do Canvas que renderiza a mesa. */
export type PongCanvasProps = { snapshot: GameSnapshot };

/** Props do painel de estado que mantém o jogo ao fundo. */
export type PhaseStageProps = {
  state: MatchState;
  profiles: PlayerProfiles;
  children: ReactNode;
};

/** Props do cartão que contém os estados da partida. */
export type PhaseBackdropProps = { children: ReactNode };

/** Props do conteúdo do painel de placar. */
export type PlayerScoreboardProps = {
  score: GameSnapshot["score"];
  profiles: PlayerProfiles;
  phase: MatchState["phase"];
};

/** Props do cartão de um jogador no placar. */
export type PlayerScoreCardProps = {
  side: Side;
  profile: PlayerProfile | null;
  score: number;
  phase: MatchState["phase"];
};

/** Props da seleção de fase da partida. */
export type PhaseViewProps = {
  state: MatchState;
  profiles: PlayerProfiles;
  onRequestRematch: () => void;
  onRequestResume: () => void;
  onRequestLeave: () => void;
};

/** Props da fase básica da partida. */
export type BasicPhaseViewProps = {
  state: MatchState;
  profiles: PlayerProfiles;
};

/** Props da fase em andamento. */
export type PlayingPhaseProps = BasicPhaseViewProps;

/** Props de uma fase com mensagem de estado. */
export type StatusPhaseProps = BasicPhaseViewProps & { title: string };

/** Props da fase de contagem regressiva. */
export type CountdownPhaseProps = BasicPhaseViewProps;

/** Props do componente principal do jogo. */
export type PongAppProps = { transport: Transport };

/** Props de um trilho da mesa. */
export type TableRailProps = {
  position: [number, number, number];
  size: [number, number, number];
};

/** Props de uma raquete. */
export type PaddleProps = { side: Side; position: number };

/** Ponto usado no rastro da bola. */
export type BallPoint = { x: number; z: number };

/** Estado visual do impacto da bola. */
export type Impact = { strength: number; angle: number };

/** Props do rastro da bola. */
export type BallTrailProps = { trail: BallPoint[]; speed: number };

/** Props de um ponto do rastro. */
export type TrailPointProps = {
  point: BallPoint;
  index: number;
  speedFactor: number;
  color: string;
};

/** Props do efeito visual de impacto. */
export type ImpactFlashProps = {
  impact: MutableRefObject<Impact>;
};

/** Props do componente visual da bola. */
export type BallProps = { snapshot: GameSnapshot };

/** Props do corpo visual da bola. */
export type BallBodyProps = {
  snapshot: GameSnapshot;
  impact?: MutableRefObject<Impact>;
};

/** Props da cena completa do Pong. */
export type PongSceneProps = { snapshot: GameSnapshot };

/** Opções do hook de entrada da raquete. */
export type UsePaddleInputOptions = {
  enabled: boolean;
  paddlePosition: number;
};
