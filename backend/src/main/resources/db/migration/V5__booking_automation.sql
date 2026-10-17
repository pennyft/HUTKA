-- Раздел 6.3: когда просрочка эскалирована в «Споры» (защита от повторной эскалации)
ALTER TABLE bookings ADD COLUMN escalated_at TIMESTAMPTZ;

-- Раздел 6.5: страйки неявки партнёра; одна бронь — один страйк
CREATE TABLE partner_no_show_strikes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id     UUID        NOT NULL REFERENCES cars (id),
    booking_id UUID        NOT NULL UNIQUE REFERENCES bookings (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_no_show_strikes_car_created ON partner_no_show_strikes (car_id, created_at DESC);

-- Раздел 6.5: машина скрыта автоматически по страйкам; партнёр не может сам снять это скрытие
ALTER TABLE cars ADD COLUMN hidden_by_strikes BOOLEAN NOT NULL DEFAULT FALSE;

-- Выборки sweeper'а по статусу и срокам
CREATE INDEX idx_bookings_status_planned_start ON bookings (status, planned_start_at);
CREATE INDEX idx_bookings_status_planned_end ON bookings (status, planned_end_at);
