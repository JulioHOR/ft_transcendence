-- Partida de Pong concluída; o id vem do servidor de jogo (uuid).
CREATE TABLE IF NOT EXISTS pong_match (
    id             TEXT PRIMARY KEY,
    left_user_id   INTEGER NOT NULL,
    right_user_id  INTEGER NOT NULL,
    winner_user_id INTEGER NOT NULL,
    left_score     INTEGER NOT NULL,
    right_score    INTEGER NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_pong_match_left_user FOREIGN KEY (left_user_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_pong_match_right_user FOREIGN KEY (right_user_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_pong_match_winner_user FOREIGN KEY (winner_user_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT ck_pong_match_distinct_users CHECK (left_user_id <> right_user_id),
    CONSTRAINT ck_pong_match_winner_participates
        CHECK (winner_user_id IN (left_user_id, right_user_id)),
    CONSTRAINT ck_pong_match_scores_non_negative
        CHECK (left_score >= 0 AND right_score >= 0)
);

CREATE OR REPLACE TRIGGER pong_match_set_updated_at
    BEFORE UPDATE ON pong_match
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS pong_match_created_at_idx
    ON pong_match (created_at DESC);

CREATE INDEX IF NOT EXISTS pong_match_left_user_idx
    ON pong_match (left_user_id);

CREATE INDEX IF NOT EXISTS pong_match_right_user_idx
    ON pong_match (right_user_id);

CREATE INDEX IF NOT EXISTS pong_match_winner_idx
    ON pong_match (winner_user_id);
