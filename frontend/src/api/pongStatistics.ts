import { errorMessage } from "./http";
import { pongStatisticsUrl } from "./endpoints";

/** Progresso de uma conquista do Pong. */
export type PongAchievement = {
  name: string;
  description: string;
  progress: number;
  target: number;
};

/** Partida concluída exibida no histórico. */
export type PongMatchHistory = {
  opponentId: number;
  opponentNickname: string;
  playedAt: string;
  score: number;
  opponentScore: number;
};

/** Jogador exibido na classificação. */
export type PongLeaderboardEntry = {
  userId: number;
  nickname: string;
  wins: number;
  losses: number;
  ranking: number;
};

/** Estatísticas e progresso persistidos das partidas de Pong. */
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

/** Carrega o histórico, as estatísticas e a classificação do usuário. */
export async function getPongStatistics(
  userId: number,
): Promise<PongStatistics> {
  const response = await fetch(`${pongStatisticsUrl}?id=${userId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "Falha ao carregar estatísticas do Pong"),
    );
  }
  return (await response.json()) as PongStatistics;
}
