-- Conta de usuário. O nome `account` evita a palavra reservada USER.
CREATE TABLE IF NOT EXISTS account (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL,
    nickname        TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    character       TEXT NOT NULL DEFAULT 'character',
    session_version INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_account_email UNIQUE (email),
    CONSTRAINT uq_account_nickname UNIQUE (nickname)
);

-- Mantém updated_at sincronizado em todo UPDATE de linha.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER account_set_updated_at
    BEFORE UPDATE ON account
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
