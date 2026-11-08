-- Bloqueio de um usuário por outro; a PK substitui a chave composta.
CREATE TABLE IF NOT EXISTS blocked_user (
    id         SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_blocked_user_blocker FOREIGN KEY (blocker_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_blocked_user_blocked FOREIGN KEY (blocked_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT ck_blocked_user_distinct_users CHECK (blocker_id <> blocked_id),
    CONSTRAINT uq_blocked_user_pair UNIQUE (blocker_id, blocked_id)
);

CREATE OR REPLACE TRIGGER blocked_user_set_updated_at
    BEFORE UPDATE ON blocked_user
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS blocked_user_blocked_idx
    ON blocked_user (blocked_id);
