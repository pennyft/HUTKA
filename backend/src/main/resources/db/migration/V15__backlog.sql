-- V15: доделки по ТЗ (Hutka.md, версия 5.0): блокировка пользователей (16.2), принудительное скрытие машины
-- администратором (16.3), избранное (2, 23.7). V14 занят платежами (V14__payments.sql).
-- Реквизиты выплат (users.payout_bank_details, 21.1) уже созданы в V1 — здесь их менять не нужно.
-- Обоснование решений — docs/BACKLOG_DECISIONS.md.

-- 16.2: блокировка бессрочная, с обязательной причиной
ALTER TABLE users ADD COLUMN blocked             BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN blocked_reason      VARCHAR(500);
ALTER TABLE users ADD COLUMN blocked_at          TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN blocked_by_admin_id UUID REFERENCES admins (id);
ALTER TABLE users ADD CONSTRAINT chk_users_blocked
    CHECK (blocked = (blocked_at IS NOT NULL) AND (NOT blocked OR blocked_reason IS NOT NULL));
-- фильтр «заблокированные» в админке
CREATE INDEX idx_users_blocked ON users (blocked) WHERE blocked;

-- 16.3: принудительное скрытие машины администратором; партнёр снять его не может (как hidden_by_strikes из V5)
ALTER TABLE cars ADD COLUMN hidden_by_admin        BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE cars ADD COLUMN hidden_by_admin_reason VARCHAR(500);
ALTER TABLE cars ADD COLUMN hidden_by_admin_at     TIMESTAMPTZ;
ALTER TABLE cars ADD CONSTRAINT chk_cars_hidden_by_admin
    CHECK (hidden_by_admin = (hidden_by_admin_at IS NOT NULL) AND (NOT hidden_by_admin OR hidden_by_admin_reason IS NOT NULL));

-- 2, 23.7: избранное; пара (user_id, car_id) уникальна, повторное добавление — no-op (INSERT ... ON CONFLICT DO NOTHING)
CREATE TABLE favorites (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    car_id     UUID        NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_favorites_user_car UNIQUE (user_id, car_id)
);
-- GET /favorites: новые сверху
CREATE INDEX idx_favorites_user_created ON favorites (user_id, created_at DESC);
