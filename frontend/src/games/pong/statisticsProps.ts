import type { PongStatistics as PongStatisticsData } from "../../api/pongStatistics";

/** Props da seção de estatísticas do Pong. */
export type PongStatisticsProps = { userId: number };

/** Props do conteúdo completo das estatísticas. */
export type StatisticsContentProps = { statistics: PongStatisticsData };

/** Props do resumo de estatísticas. */
export type StatisticsSummaryProps = StatisticsContentProps;

/** Props do progresso de nível. */
export type LevelProgressProps = StatisticsContentProps;

/** Props dos detalhes do progresso de nível. */
export type LevelProgressDetailsProps = StatisticsContentProps;

/** Props de um indicador do resumo de partidas. */
export type SummaryItemProps = {
  label: string;
  value: number | string;
};

/** Props da lista de conquistas. */
export type AchievementListProps = {
  achievements: PongStatisticsData["achievements"];
};

/** Props de um cartão de conquista. */
export type AchievementCardProps = {
  achievement: PongStatisticsData["achievements"][number];
};

/** Props do conteúdo de um cartão de conquista. */
export type AchievementCardContentProps = AchievementCardProps & {
  completed: boolean;
};

/** Props do histórico de partidas. */
export type MatchHistoryProps = {
  history: PongStatisticsData["history"];
};

/** Props da tabela de histórico. */
export type MatchHistoryTableProps = MatchHistoryProps;

/** Props das linhas do histórico. */
export type MatchHistoryRowsProps = MatchHistoryProps;

/** Props da classificação. */
export type LeaderboardProps = {
  entries: PongStatisticsData["leaderboard"];
};

/** Props da tabela de classificação. */
export type LeaderboardTableProps = LeaderboardProps;

/** Props das linhas da classificação. */
export type LeaderboardRowsProps = LeaderboardProps;

/** Props do cabeçalho expansível de uma tabela. */
export type ExpandableTableHeadingProps = {
  title: string;
  expanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
};
