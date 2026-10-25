from marshmallow import Schema, fields


class PongAchievementSchema(Schema):
    """Progresso de uma conquista do Pong."""

    name = fields.String()
    description = fields.String()
    progress = fields.Integer()
    target = fields.Integer()


class PongMatchHistorySchema(Schema):
    """Partida concluída exibida no perfil."""

    opponentId = fields.Integer()
    opponentNickname = fields.String()
    playedAt = fields.DateTime()
    score = fields.Integer()
    opponentScore = fields.Integer()


class PongLeaderboardEntrySchema(Schema):
    """Jogador listado na classificação do Pong."""

    userId = fields.Integer()
    nickname = fields.String()
    wins = fields.Integer()
    losses = fields.Integer()
    ranking = fields.Integer()


class PongStatisticsSchema(Schema):
    """Estatísticas, progresso, histórico e classificação do Pong."""

    matchesPlayed = fields.Integer()
    wins = fields.Integer()
    losses = fields.Integer()
    ranking = fields.Integer(allow_none=True)
    level = fields.Integer()
    netWins = fields.Integer()
    netWinsInCurrentLevel = fields.Integer()
    winsForNextLevel = fields.Integer()
    achievements = fields.List(fields.Nested(PongAchievementSchema))
    history = fields.List(fields.Nested(PongMatchHistorySchema))
    leaderboard = fields.List(fields.Nested(PongLeaderboardEntrySchema))
