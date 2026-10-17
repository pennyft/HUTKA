-- V3: бронирования (раздел 21.3, статусы — 22.1).
-- Добавлено сверх 21.3 (см. примечания в BookingService):
--   price_per_hour — фиксация цены на момент брони (раздел 10.3: изменения цены не затрагивают уже созданные брони);
--   confirmed_at   — момент подтверждения брони (Instant Book — сразу, Request to Book — после одобрения партнёром);
--   decline_reason — причина отклонения партнёром (раздел 10.4).

CREATE TABLE bookings (
    id                   UUID PRIMARY KEY,
    renter_id            UUID           NOT NULL REFERENCES users (id),
    car_id               UUID           NOT NULL REFERENCES cars (id),
    status               VARCHAR(20)    NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'finished', 'cancelled')),
    planned_start_at     TIMESTAMPTZ    NOT NULL,
    planned_end_at       TIMESTAMPTZ    NOT NULL,
    actual_start_at      TIMESTAMPTZ,
    actual_end_at        TIMESTAMPTZ,
    price_per_hour       NUMERIC(10, 2) NOT NULL,
    price_estimate       NUMERIC(10, 2) NOT NULL,
    final_price          NUMERIC(10, 2),
    pdd_discount_applied BOOLEAN        NOT NULL DEFAULT FALSE,
    discount_amount      NUMERIC(10, 2),
    overdue_hours        NUMERIC(10, 4),
    confirmed_at         TIMESTAMPTZ,
    decline_reason       VARCHAR(255),
    agreement_pdf_url    VARCHAR(1024),
    agreement_sent_at    TIMESTAMPTZ,
    created_at           TIMESTAMPTZ    NOT NULL,
    CONSTRAINT chk_bookings_planned_range CHECK (planned_end_at > planned_start_at)
);

CREATE INDEX idx_bookings_renter_id ON bookings (renter_id);
CREATE INDEX idx_bookings_car_status ON bookings (car_id, status);

CREATE TABLE booking_photos_before (
    booking_id UUID          NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    url        VARCHAR(1024) NOT NULL
);
CREATE INDEX idx_booking_photos_before_booking_id ON booking_photos_before (booking_id);

CREATE TABLE booking_photos_after (
    booking_id UUID          NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    url        VARCHAR(1024) NOT NULL
);
CREATE INDEX idx_booking_photos_after_booking_id ON booking_photos_after (booking_id);
