import type { PongStatistics as PongStatisticsData } from "../../api/pongStatistics";

/** Props for the Pong statistics section. */
export type PongStatisticsProps = { userId: number };

/** Props for the complete statistics content. */
export type StatisticsContentProps = { statistics: PongStatisticsData };

/** Props for the statistics summary. */
export type StatisticsSummaryProps = StatisticsContentProps;

/** Props for level progress. */
export type LevelProgressProps = StatisticsContentProps;

/** Props for the level progress details. */
export type LevelProgressDetailsProps = StatisticsContentProps;

/** Props for a match summary indicator. */
export type SummaryItemProps = {
  label: string;
  value: number | string;
};

/** Props for the achievements list. */
export type AchievementListProps = {
  achievements: PongStatisticsData["achievements"];
};

/** Props for an achievement card. */
export type AchievementCardProps = {
  achievement: PongStatisticsData["achievements"][number];
};

/** Props for an achievement card's content. */
export type AchievementCardContentProps = AchievementCardProps & {
  completed: boolean;
};

/** Props for the match history. */
export type MatchHistoryProps = {
  history: PongStatisticsData["history"];
};

/** Props for the history table. */
export type MatchHistoryTableProps = MatchHistoryProps;

/** Props for the history rows. */
export type MatchHistoryRowsProps = MatchHistoryProps;

/** Props for the leaderboard. */
export type LeaderboardProps = {
  entries: PongStatisticsData["leaderboard"];
};

/** Props for the leaderboard table. */
export type LeaderboardTableProps = LeaderboardProps;

/** Props for the leaderboard rows. */
export type LeaderboardRowsProps = LeaderboardProps;

/** Props for an expandable table header. */
export type ExpandableTableHeadingProps = {
  title: string;
  expanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
};
