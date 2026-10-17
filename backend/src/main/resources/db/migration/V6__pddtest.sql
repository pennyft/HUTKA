-- V6: тест ПДД (раздел 5, 21: PddTestAttempt; 23.8).
-- Добавлено сверх 21 (см. docs/PDDTEST_DECISIONS.md): таблицы pdd_questions и pdd_discounts,
-- а в pdd_test_attempts — status, question_ids, started_at, expires_at, submitted_at (серверный лимит времени, 5.1).

CREATE TABLE pdd_questions (
    id             UUID PRIMARY KEY,
    text           VARCHAR(2000) NOT NULL,
    variants       JSONB         NOT NULL,
    correct_index  INTEGER       NOT NULL,
    source_chapter INTEGER,
    category       VARCHAR(30),
    active         BOOLEAN       NOT NULL DEFAULT TRUE,
    source         VARCHAR(200),
    created_at     TIMESTAMPTZ   NOT NULL,
    CONSTRAINT chk_pdd_variants_array CHECK (jsonb_typeof(variants) = 'array' AND jsonb_array_length(variants) >= 2),
    CONSTRAINT chk_pdd_correct_index CHECK (correct_index >= 0 AND correct_index < jsonb_array_length(variants))
);
CREATE INDEX idx_pdd_questions_active ON pdd_questions (active);

CREATE TABLE pdd_test_attempts (
    id               UUID PRIMARY KEY,
    user_id          UUID        NOT NULL REFERENCES users (id),
    cycle_started_at TIMESTAMPTZ NOT NULL,
    attempt_number   INTEGER     NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
    status           VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'expired')),
    question_ids     JSONB       NOT NULL,
    started_at       TIMESTAMPTZ NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    submitted_at     TIMESTAMPTZ,
    errors_count     INTEGER,
    passed           BOOLEAN,
    CONSTRAINT uq_pdd_attempt_in_cycle UNIQUE (user_id, cycle_started_at, attempt_number)
);
-- не более одной незавершённой попытки на пользователя (защита от гонки двух GET /pddtest/questions)
CREATE UNIQUE INDEX uq_pdd_one_in_progress ON pdd_test_attempts (user_id) WHERE status = 'in_progress';
CREATE INDEX idx_pdd_attempts_user_started ON pdd_test_attempts (user_id, started_at DESC);

CREATE TABLE pdd_discounts (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id),
    attempt_id UUID        NOT NULL REFERENCES pdd_test_attempts (id),
    granted_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    booking_id UUID REFERENCES bookings (id),
    CONSTRAINT chk_pdd_discount_window CHECK (expires_at > granted_at)
);
CREATE INDEX idx_pdd_discounts_user ON pdd_discounts (user_id, used_at, expires_at);
