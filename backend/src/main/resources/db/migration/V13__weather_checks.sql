-- V13: отметки погодных проверок броней (раздел 12, 17.2). V12 занят групповыми поездками (V12__group_trips.sql).
-- Одна строка = «погода по этой брони проверена»; пара (booking_id, kind) уникальна, чтобы повторный запуск задачи Quartz
-- или два параллельных запуска не отправили арендатору уведомление дважды. Обоснование — docs/WEATHER_DECISIONS.md.

CREATE TABLE weather_checks (
    id         UUID PRIMARY KEY,
    booking_id UUID         NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    -- booking: поездка в пределах 7 дней, проверка сразу после брони; day_before: поездка дальше 7 дней, проверка за сутки до начала
    kind       VARCHAR(16)  NOT NULL CHECK (kind IN ('booking', 'day_before')),
    checked_at TIMESTAMPTZ  NOT NULL,
    -- имена WeatherHazard через запятую; пусто, если погода приемлемая
    hazards    VARCHAR(200) NOT NULL DEFAULT '',
    -- уведомление создано только при неблагоприятных условиях
    notified   BOOLEAN      NOT NULL,
    CONSTRAINT uq_weather_check UNIQUE (booking_id, kind),
    CONSTRAINT chk_weather_notified CHECK (NOT notified OR hazards <> '')
);
