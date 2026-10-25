from db import db_cursor
from .constants import POINTS_TO_WIN

WINS_PER_LEVEL = 5


_PLAYER_RESULTS = """
WITH player_results AS (
    SELECT left_user_id AS user_id, winner_user_id = left_user_id AS won
    FROM pong_matches
    UNION ALL
    SELECT right_user_id AS user_id, winner_user_id = right_user_id AS won
    FROM pong_matches
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


def save_match(
    match_id: str,
    left_user_id: int,
    right_user_id: int,
    winner_user_id: int,
    left_score: int,
    right_score: int,
) -> None:
    """Persiste o resultado final uma única vez."""
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO pong_matches "
            "(id, left_user_id, right_user_id, winner_user_id, left_score, right_score) "
            "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING;",
            (
                match_id,
                left_user_id,
                right_user_id,
                winner_user_id,
                left_score,
                right_score,
            ),
        )


def user_exists(user_id: int) -> bool:
    """Verifica se o usuário existe."""
    with db_cursor() as cur:
        cur.execute("SELECT EXISTS (SELECT 1 FROM users WHERE id = %s);", (user_id,))
        return cur.fetchone()[0]


def get_statistics(user_id: int) -> dict:
    """Retorna estatísticas, posição e conquistas calculadas pelo histórico."""
    with db_cursor() as cur:
        cur.execute(
            _PLAYER_RESULTS
            + "SELECT matches_played, wins, losses, ranking "
            "FROM ranked_players WHERE user_id = %s;",
            (user_id,),
        )
        row = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FROM pong_matches "
            "WHERE winner_user_id = %s AND ("
            "(left_user_id = %s AND left_score = %s AND right_score = 0) OR "
            "(right_user_id = %s AND right_score = %s AND left_score = 0));",
            (user_id, user_id, POINTS_TO_WIN, user_id, POINTS_TO_WIN),
        )
        perfect_wins = cur.fetchone()[0]
    matches_played, wins, losses, ranking = row or (0, 0, 0, None)
    net_wins = wins - losses
    level_progress = max(0, net_wins)
    return {
        "matchesPlayed": matches_played,
        "wins": wins,
        "losses": losses,
        "ranking": ranking,
        "level": level_progress // WINS_PER_LEVEL + 1,
        "netWins": net_wins,
        "netWinsInCurrentLevel": level_progress % WINS_PER_LEVEL,
        "winsForNextLevel": WINS_PER_LEVEL,
        "achievements": [
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
                "progress": min(perfect_wins, 3),
                "target": 3,
            },
        ],
    }


def get_match_history(user_id: int) -> list[dict]:
    """Retorna as partidas concluídas mais recentes do usuário."""
    with db_cursor() as cur:
        cur.execute(
            "SELECT opponent.id, opponent.nickname, match.played_at, "
            "CASE WHEN match.left_user_id = %s "
            "THEN match.left_score ELSE match.right_score END, "
            "CASE WHEN match.left_user_id = %s "
            "THEN match.right_score ELSE match.left_score END "
            "FROM pong_matches AS match "
            "JOIN users AS opponent ON opponent.id = CASE "
            "WHEN match.left_user_id = %s THEN match.right_user_id "
            "ELSE match.left_user_id END "
            "WHERE match.left_user_id = %s OR match.right_user_id = %s "
            "ORDER BY match.played_at DESC LIMIT 20;",
            (user_id, user_id, user_id, user_id, user_id),
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


def get_leaderboard(limit: int = 10) -> list[dict]:
    """Retorna os jogadores ordenados por vitórias e derrotas."""
    with db_cursor() as cur:
        cur.execute(
            _PLAYER_RESULTS
            + "SELECT users.id, users.nickname, ranked_players.wins, "
            "ranked_players.losses, ranked_players.ranking "
            "FROM ranked_players JOIN users ON users.id = ranked_players.user_id "
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
