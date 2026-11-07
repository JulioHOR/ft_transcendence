import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import {
  getPongStatistics,
  type PongStatistics as PongStatisticsData,
} from "../../api/pongStatistics";
import { friendlyError } from "../../api/http";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorText } from "../../ui/ErrorText";
import { AppIcon, type AppIconName } from "../../ui/AppIcon";
import { SectionCard } from "../../ui/SectionCard";

const TABLE_PAGE_SIZE = 7;

/** Exibe o desempenho e o histórico de Pong no perfil. */
export function PongStatistics({ userId }: { userId: number }) {
  const { statistics, error } = usePongStatistics(userId);

  return (
    <SectionCard>
      <Stack spacing={2.5}>
        <Typography variant="h2">Desempenho no Pong</Typography>
        <ErrorText error={error} />
        {!statistics && !error ? (
          <Typography color="text.secondary">Carregando…</Typography>
        ) : null}
        {statistics ? <StatisticsContent statistics={statistics} /> : null}
      </Stack>
    </SectionCard>
  );
}

/** Busca os dados de partidas do perfil. */
function usePongStatistics(userId: number) {
  const [statistics, setStatistics] = useState<PongStatisticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPongStatistics(userId)
      .then(setStatistics)
      .catch((failure: unknown) => {
        setError(
          friendlyError(
            failure,
            "Falha ao carregar dados de Pong",
            "Falha ao carregar estatísticas",
          ),
        );
      });
  }, [userId]);

  return { statistics, error };
}

/** Organiza resultados, nível, conquistas e partidas recentes. */
function StatisticsContent({ statistics }: { statistics: PongStatisticsData }) {
  return (
    <Stack spacing={3}>
      <StatisticsSummary statistics={statistics} />
      <LevelProgress statistics={statistics} />
      <AchievementList achievements={statistics.achievements} />
      <Leaderboard entries={statistics.leaderboard} />
      <MatchHistory history={statistics.history} />
    </Stack>
  );
}

/** Resume partidas, vitórias, derrotas e posição no ranking. */
function StatisticsSummary({ statistics }: { statistics: PongStatisticsData }) {
  const values = [
    { label: "Partidas", value: statistics.matchesPlayed },
    { label: "Vitórias", value: statistics.wins },
    { label: "Derrotas", value: statistics.losses },
    {
      label: "Posição",
      value: statistics.ranking ? `#${statistics.ranking}` : "—",
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 1,
      }}
    >
      {values.map((item) => (
        <SummaryItem key={item.label} {...item} />
      ))}
    </Box>
  );
}

/** Exibe um indicador do resumo de partidas. */
function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography variant="h1">{value}</Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Exibe o nível e o avanço até o próximo nível. */
function LevelProgress({ statistics }: { statistics: PongStatisticsData }) {
  const progress =
    (statistics.netWinsInCurrentLevel / statistics.winsForNextLevel) * 100;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <LevelProgressDetails statistics={statistics} />
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Resume o nível atual e o avanço até o próximo. */
function LevelProgressDetails({
  statistics,
}: {
  statistics: PongStatisticsData;
}) {
  return (
    <Stack direction="row" sx={levelProgressRowSx}>
      <Typography variant="h2">Nível {statistics.level}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ marginLeft: "auto", textAlign: "right" }}
      >
        Ganhe mais partidas do que perca para avançar de nível.
      </Typography>
    </Stack>
  );
}

const levelProgressRowSx = {
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  columnGap: 2,
};

/** Exibe as conquistas em uma grade de distintivos. */
function AchievementList({
  achievements,
}: {
  achievements: PongStatisticsData["achievements"];
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="h3">Conquistas</Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 1,
        }}
      >
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.name} achievement={achievement} />
        ))}
      </Box>
    </Stack>
  );
}

/** Exibe o objetivo e o progresso de uma conquista. */
function AchievementCard({ achievement }: AchievementCardProps) {
  const completed = achievement.progress === achievement.target;
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: completed ? "primary.main" : "divider",
        bgcolor: completed ? "action.hover" : "background.paper",
      }}
    >
      <AchievementCardContent achievement={achievement} completed={completed} />
    </Card>
  );
}

/** Conteúdo visual de um cartão de conquista. */
function AchievementCardContent(props: AchievementCardContentProps) {
  const progress =
    (props.achievement.progress / props.achievement.target) * 100;
  const icon = achievementIcons[props.achievement.name] ?? "achievement";
  return (
    <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", p: 2 }}>
      <AppIcon
        name={icon}
        color={props.completed ? "success" : "disabled"}
        sx={{ fontSize: 40 }}
      />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {props.achievement.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {props.achievement.description}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label={`${props.achievement.name}: ${props.achievement.progress} de ${props.achievement.target}`}
      />
    </Stack>
  );
}

const achievementIcons: Record<string, AppIconName> = {
  "Primeira vitória": "achievement",
  Competidor: "competitor",
  Professional: "professional",
};

type AchievementCardProps = {
  achievement: PongStatisticsData["achievements"][number];
};

type AchievementCardContentProps = AchievementCardProps & {
  completed: boolean;
};

/** Lista as partidas recentes com adversário, resultado e placar. */
function MatchHistory({ history }: { history: PongStatisticsData["history"] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stack spacing={1}>
      <ExpandableTableHeading
        title="Partidas recentes"
        expanded={expanded}
        canExpand={history.length > TABLE_PAGE_SIZE}
        onToggle={() => setExpanded(!expanded)}
      />
      {history.length === 0 ? (
        <EmptyState>Partidas concluídas aparecerão aqui.</EmptyState>
      ) : (
        <MatchHistoryTable
          history={expanded ? history : history.slice(0, TABLE_PAGE_SIZE)}
        />
      )}
    </Stack>
  );
}

function MatchHistoryTable({
  history,
}: {
  history: PongStatisticsData["history"];
}) {
  return (
    <TableContainer>
      <Table size="small" sx={tableSx}>
        <TableHead>
          <TableRow>
            <TableCell>Adversário</TableCell>
            <TableCell>Data</TableCell>
            <TableCell align="right">Placar</TableCell>
          </TableRow>
        </TableHead>
        <MatchHistoryRows history={history} />
      </Table>
    </TableContainer>
  );
}

/** Exibe os resultados das partidas nas linhas da tabela. */
function MatchHistoryRows({
  history,
}: {
  history: PongStatisticsData["history"];
}) {
  return (
    <TableBody>
      {history.map((match) => (
        <TableRow key={`${match.playedAt}-${match.opponentId}`}>
          <TableCell>
            <Link component={RouterLink} to={`/profile/${match.opponentId}`}>
              {match.opponentNickname}
            </Link>
          </TableCell>
          <TableCell>
            {new Date(match.playedAt).toLocaleDateString("pt-BR")}
          </TableCell>
          <TableCell align="right">
            {match.score} x {match.opponentScore}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

const tableSx = {
  width: "100%",
  "& th, & td": { px: 0 },
};

/** Exibe a classificação geral e as regras de desempate. */
function Leaderboard({
  entries,
}: {
  entries: PongStatisticsData["leaderboard"];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stack spacing={1}>
      <ExpandableTableHeading
        title="Classificação"
        expanded={expanded}
        canExpand={entries.length > TABLE_PAGE_SIZE}
        onToggle={() => setExpanded(!expanded)}
      />
      <LeaderboardDescription />
      {entries.length === 0 ? (
        <EmptyState>Sem partidas concluídas.</EmptyState>
      ) : (
        <LeaderboardTable
          entries={expanded ? entries : entries.slice(0, TABLE_PAGE_SIZE)}
        />
      )}
    </Stack>
  );
}

function LeaderboardDescription() {
  return (
    <Typography variant="body2" color="text.secondary">
      Ordenada por vitórias; empates são decididos por menos derrotas e data de
      cadastro.
    </Typography>
  );
}

function LeaderboardTable({
  entries,
}: {
  entries: PongStatisticsData["leaderboard"];
}) {
  return (
    <TableContainer>
      <Table size="small" sx={tableSx}>
        <TableHead>
          <TableRow>
            <TableCell>Posição</TableCell>
            <TableCell>Jogador</TableCell>
            <TableCell align="right">Vitórias</TableCell>
            <TableCell align="right">Derrotas</TableCell>
          </TableRow>
        </TableHead>
        <LeaderboardRows entries={entries} />
      </Table>
    </TableContainer>
  );
}

function ExpandableTableHeading({
  title,
  expanded,
  canExpand,
  onToggle,
}: {
  title: string;
  expanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="h3">{title}</Typography>
      {canExpand ? (
        <Link component="button" type="button" onClick={onToggle}>
          {expanded ? "Carregar menos" : "Carregar mais"}
        </Link>
      ) : null}
    </Stack>
  );
}

/** Exibe posição e resultados dos jogadores nas linhas da tabela. */
function LeaderboardRows({
  entries,
}: {
  entries: PongStatisticsData["leaderboard"];
}) {
  return (
    <TableBody>
      {entries.map((entry) => (
        <TableRow key={entry.userId}>
          <TableCell>{entry.ranking}º</TableCell>
          <TableCell>
            <Link component={RouterLink} to={`/profile/${entry.userId}`}>
              {entry.nickname}
            </Link>
          </TableCell>
          <TableCell align="right">{entry.wins}</TableCell>
          <TableCell align="right">{entry.losses}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
