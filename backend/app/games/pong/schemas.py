from marshmallow import Schema, fields


class PongAchievementSchema(Schema):
    name = fields.String()
    description = fields.String()
    progress = fields.Integer()
    target = fields.Integer()


class PongMatchHistorySchema(Schema):
    opponentId = fields.Integer()
    opponentNickname = fields.String()
    playedAt = fields.DateTime()
    score = fields.Integer()
    opponentScore = fields.Integer()


class PongLeaderboardEntrySchema(Schema):
    userId = fields.Integer()
    nickname = fields.String()
    wins = fields.Integer()
    losses = fields.Integer()
    ranking = fields.Integer()


class PongStatisticsSchema(Schema):
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
