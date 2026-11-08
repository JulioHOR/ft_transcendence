-- Amizade: uma linha por convite (requester -> addressee).
CREATE TABLE IF NOT EXISTS friendship (
    id           SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL,
    addressee_id INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_friendship_requester FOREIGN KEY (requester_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_friendship_addressee FOREIGN KEY (addressee_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT ck_friendship_status CHECK (status IN ('pending', 'accepted')),
    CONSTRAINT ck_friendship_distinct_users CHECK (requester_id <> addressee_id),
    CONSTRAINT uq_friendship_directed_pair UNIQUE (requester_id, addressee_id)
);

-- Garante que só exista uma aresta entre dois usuários, em qualquer direção.
CREATE UNIQUE INDEX IF NOT EXISTS friendship_pair_idx
    ON friendship (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS friendship_addressee_idx
    ON friendship (addressee_id);

CREATE OR REPLACE TRIGGER friendship_set_updated_at
    BEFORE UPDATE ON friendship
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Avatar binário; no máximo uma imagem por conta.
CREATE TABLE IF NOT EXISTS avatar (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    data         BYTEA NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_avatar_account FOREIGN KEY (user_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_avatar_user UNIQUE (user_id)
);

CREATE OR REPLACE TRIGGER avatar_set_updated_at
    BEFORE UPDATE ON avatar
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Mensagens de chat; recipient_id NULL indica o chat global.
CREATE TABLE IF NOT EXISTS chat_message (
    id           BIGSERIAL PRIMARY KEY,
    sender_id    INTEGER NOT NULL,
    recipient_id INTEGER,
    text         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_chat_message_recipient FOREIGN KEY (recipient_id)
        REFERENCES account (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE OR REPLACE TRIGGER chat_message_set_updated_at
    BEFORE UPDATE ON chat_message
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS chat_message_global_idx
    ON chat_message (id)
    WHERE recipient_id IS NULL;

CREATE INDEX IF NOT EXISTS chat_message_private_sender_idx
    ON chat_message (sender_id, recipient_id);

CREATE INDEX IF NOT EXISTS chat_message_private_recipient_idx
    ON chat_message (recipient_id, sender_id);
