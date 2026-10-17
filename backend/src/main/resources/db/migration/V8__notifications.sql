-- V8: уведомления (раздел 13, 21: Notification). Номер V8 — предположение (после V7__ratings_settings); если у вас
-- уже занят V8, переименуйте файл в следующий свободный номер.

CREATE TABLE notifications (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id),
    -- имя константы NotificationType; без CHECK, чтобы новые типы из других пакетов не требовали миграции
    type       VARCHAR(50) NOT NULL,
    payload    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);
-- история пользователя: новые сверху (GET /notifications)
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
-- счётчик и фильтр «непрочитанные»
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;
