import time
from typing import Any

import psycopg2
from psycopg2.pool import PoolError

from db import db_cursor
from .constants import POINTS_TO_WIN

NET_WINS_PER_LEVEL = 3
PERFECT_WINS_FOR_ACHIEVEMENT = 3
HISTORY_LIMIT = 20
LEADERBOARD_LIMIT = 10


_PLAYER_RESULTS = """
WITH player_results AS (
    SELECT left_user_id AS user_id, winner_user_id = left_user_id AS won
    FROM pong_match
    UNION ALL
    SELECT right_user_id AS user_id, winner_user_id = right_user_id AS won
    FROM pong_match
), player_totals AS (
    SELECT
        user_id,
        COUNT(*) AS matches_played,
        COUNT(*) FILTER (WHERE won) AS wins,
        COUNT(*) FILTER (WHERE NOT won) AS losses
    FROM player_results
    GROUP BY user_id
), ranked_players AS (
    SELECT
        user_id,
        matches_played,
        wins,
        losses,
        ROW_NUMBER() OVER (ORDER BY wins DESC, losses ASC, user_id) AS ranking
    FROM player_totals
)
"""


_SAVE_RETRY_DELAYS_SECONDS = (0.2, 0.5)

_SAVE_SQL = (
    "INSERT INTO pong_match "
    "(id, left_user_id, right_user_id, winner_user_id, left_score, right_score) "
    "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING;"
)


def save_match(
    match_id: str,
    left_user_id: int,
    right_user_id: int,
    winner_user_id: int,
    left_score: int,
    right_score: int,
) -> None:
    params = (
        match_id,
        left_user_id,
        right_user_id,
        winner_user_id,
        left_score,
        right_score,
    )
    for attempt in range(len(_SAVE_RETRY_DELAYS_SECONDS) + 1):
        try:
            with db_cursor() as cur:
                cur.execute(_SAVE_SQL, params)
            return
        except (psycopg2.OperationalError, PoolError):
            if attempt == len(_SAVE_RETRY_DELAYS_SECONDS):
                raise
            time.sleep(_SAVE_RETRY_DELAYS_SECONDS[attempt])


def user_exists(user_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM account WHERE id = %s);", (user_id,)
        )
        row = cur.fetchone()
    return bool(row and row[0])


def _fetch_player_totals(cur, user_id: int) -> tuple[int, int, int, int | None]:
    cur.execute(
        _PLAYER_RESULTS
        + "SELECT matches_played, wins, losses, ranking "
        "FROM ranked_players WHERE user_id = %s;",
        (user_id,),
    )
    row = cur.fetchone()
    return row or (0, 0, 0, None)


def _count_perfect_wins(cur, user_id: int) -> int:
    cur.execute(
        "SELECT COUNT(*) FROM pong_match "
        "WHERE winner_user_id = %s AND ("
        "(left_user_id = %s AND left_score = %s AND right_score = 0) OR "
        "(right_user_id = %s AND right_score = %s AND left_score = 0));",
        (user_id, user_id, POINTS_TO_WIN, user_id, POINTS_TO_WIN),
    )
    row = cur.fetchone()
    return 0 if row is None else row[0]


def _levels_for_net_wins(net_wins: int) -> dict[str, int]:
    level_progress = max(0, net_wins)
    return {
        "level": level_progress // NET_WINS_PER_LEVEL + 1,
        "netWinsInCurrentLevel": level_progress % NET_WINS_PER_LEVEL,
        "winsForNextLevel": NET_WINS_PER_LEVEL,
    }


def _achievements(wins: int, perfect_wins: int) -> list[dict[str, Any]]:
    return [
        {
            "name": "Primeira vitória",
            "description": "Vença sua primeira partida.",
            "progress": min(wins, 1),
            "target": 1,
        },
        {
            "name": "Competidor",
            "description": "Vença cinco partidas.",
            "progress": min(wins, 5),
            "target": 5,
        },
        {
            "name": "Professional",
            "description": "Vença três partidas por 3 a 0.",
            "progress": min(perfect_wins, PERFECT_WINS_FOR_ACHIEVEMENT),
            "target": PERFECT_WINS_FOR_ACHIEVEMENT,
        },
    ]


def get_statistics(user_id: int) -> dict[str, Any]:
    with db_cursor() as cur:
        matches_played, wins, losses, ranking = _fetch_player_totals(cur, user_id)
        perfect_wins = _count_perfect_wins(cur, user_id)
    net_wins = wins - losses
    return {
        "matchesPlayed": matches_played,
        "wins": wins,
        "losses": losses,
        "ranking": ranking,
        **_levels_for_net_wins(net_wins),
        "netWins": net_wins,
        "achievements": _achievements(wins, perfect_wins),
    }


def get_match_history(user_id: int) -> list[dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT "
            "opponent.id, "
            "opponent.nickname, "
            "match.created_at, "
            "CASE WHEN match.left_user_id = %s "
            "THEN match.left_score ELSE match.right_score END, "
            "CASE WHEN match.left_user_id = %s "
            "THEN match.right_score ELSE match.left_score END "
            "FROM pong_match AS match "
            "JOIN account AS opponent ON opponent.id = CASE "
            "WHEN match.left_user_id = %s THEN match.right_user_id "
            "ELSE match.left_user_id END "
            "WHERE match.left_user_id = %s OR match.right_user_id = %s "
            "ORDER BY match.created_at DESC LIMIT %s;",
            (user_id, user_id, user_id, user_id, user_id, HISTORY_LIMIT),
        )
        rows = cur.fetchall()
    return [
        {
            "opponentId": row[0],
            "opponentNickname": row[1],
            "playedAt": row[2],
            "score": row[3],
            "opponentScore": row[4],
        }
        for row in rows
    ]


def get_leaderboard(limit: int = LEADERBOARD_LIMIT) -> list[dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(
            _PLAYER_RESULTS
            + "SELECT account.id, account.nickname, ranked_players.wins, "
            "ranked_players.losses, ranked_players.ranking "
            "FROM ranked_players JOIN account ON account.id = ranked_players.user_id "
            "ORDER BY ranked_players.ranking LIMIT %s;",
            (limit,),
        )
        rows = cur.fetchall()
    return [
        {
            "userId": row[0],
            "nickname": row[1],
            "wins": row[2],
            "losses": row[3],
            "ranking": row[4],
        }
        for row in rows
    ]
