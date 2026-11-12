import { errorMessage } from "./http";
import { apiFetch } from "./api";
import { pongStatisticsUrl } from "./endpoints";

/** Progress for a Pong achievement. */
export type PongAchievement = {
  name: string;
  description: string;
  progress: number;
  target: number;
};

/** Completed match displayed in the history. */
export type PongMatchHistory = {
  opponentId: number;
  opponentNickname: string;
  playedAt: string;
  score: number;
  opponentScore: number;
};

/** Player displayed in the leaderboard. */
export type PongLeaderboardEntry = {
  userId: number;
  nickname: string;
  wins: number;
  losses: number;
  ranking: number;
};

/** Persisted statistics and progress for Pong matches. */
export type PongStatistics = {
  matchesPlayed: number;
  wins: number;
  losses: number;
  ranking: number | null;
  level: number;
  netWins: number;
  netWinsInCurrentLevel: number;
  winsForNextLevel: number;
  achievements: PongAchievement[];
  history: PongMatchHistory[];
  leaderboard: PongLeaderboardEntry[];
};

/** Loads the user's history, statistics, and leaderboard. */
export async function getPongStatistics(
  userId: number,
): Promise<PongStatistics> {
  const response = await apiFetch(`${pongStatisticsUrl}?id=${userId}`);
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "Falha ao carregar estatísticas do Pong"),
    );
  }
  return (await response.json()) as PongStatistics;
}
