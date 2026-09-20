-- V1: базовая таблица пользователей (раздел 21.1)
-- enum'ы сделаны как varchar + check constraint, а не native Postgres enum —
-- проще расширять списком значений через новую миграцию, без ALTER TYPE.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name             VARCHAR(100)  NOT NULL,
    last_name              VARCHAR(100)  NOT NULL,
    email                  VARCHAR(255)  NOT NULL UNIQUE,
    email_verified         BOOLEAN       NOT NULL DEFAULT FALSE,
    phone                  VARCHAR(30)   NOT NULL,
    birth_date             DATE          NOT NULL,
    password_hash          VARCHAR(255)  NOT NULL,
    verification_status    VARCHAR(20)   NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'pending', 'verified')),
    license_number         VARCHAR(50),
    license_issue_date     DATE,
    is_partner             BOOLEAN       NOT NULL DEFAULT FALSE,
    payout_bank_details    JSONB,
    rating_avg             NUMERIC(3, 2),
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
