-- V7: настройки платформы (раздел 16.9, 21: PlatformSettings) и рейтинги (раздел 7, 21: Rating).
-- Все целочисленные колонки INTEGER (не SMALLINT): Hibernate при ddl-auto=validate строго сверяет тип с Integer/int.

-- Единственная строка настроек (id = 1), значения по умолчанию — из таблицы 21.
CREATE TABLE platform_settings (
    id                   INTEGER PRIMARY KEY CHECK (id = 1),
    commission_percent   NUMERIC(5, 2) NOT NULL DEFAULT 20,
    min_rating_threshold NUMERIC(3, 2) NOT NULL DEFAULT 4.0,
    min_ratings_count    INTEGER       NOT NULL DEFAULT 5 CHECK (min_ratings_count >= 1),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by_admin_id  UUID,
    CONSTRAINT chk_platform_commission CHECK (commission_percent >= 0 AND commission_percent <= 100),
    CONSTRAINT chk_platform_threshold CHECK (min_rating_threshold >= 1 AND min_rating_threshold <= 5)
);
INSERT INTO platform_settings (id) VALUES (1);

CREATE TABLE ratings (
    id           UUID PRIMARY KEY,
    booking_id   UUID        NOT NULL REFERENCES bookings (id),
    from_user_id UUID        NOT NULL REFERENCES users (id),
    to_user_id   UUID REFERENCES users (id),
    to_car_id    UUID REFERENCES cars (id),
    score        INTEGER     NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment      VARCHAR(1000),
    created_at   TIMESTAMPTZ NOT NULL,
    -- оценка адресована ровно одному получателю: пользователю ИЛИ машине (раздел 21: to_user_id или to_car)
    CONSTRAINT chk_rating_single_target CHECK ((to_user_id IS NOT NULL) <> (to_car_id IS NOT NULL))
);
-- одна оценка на (поездка, автор, получатель)
CREATE UNIQUE INDEX uq_rating_user_target ON ratings (booking_id, from_user_id, to_user_id) WHERE to_user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_rating_car_target ON ratings (booking_id, from_user_id, to_car_id) WHERE to_car_id IS NOT NULL;
CREATE INDEX idx_ratings_to_user ON ratings (to_user_id, created_at DESC);
CREATE INDEX idx_ratings_to_car ON ratings (to_car_id, created_at DESC);
CREATE INDEX idx_ratings_from_user ON ratings (from_user_id);
