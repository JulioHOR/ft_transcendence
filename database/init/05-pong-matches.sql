CREATE TABLE IF NOT EXISTS pong_matches (
    id                TEXT PRIMARY KEY,
    left_user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    right_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    winner_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    left_score        INTEGER NOT NULL,
    right_score       INTEGER NOT NULL,
    played_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (left_user_id <> right_user_id),
    CHECK (winner_user_id IN (left_user_id, right_user_id))
);

CREATE INDEX IF NOT EXISTS pong_matches_played_at_idx
    ON pong_matches (played_at DESC);
