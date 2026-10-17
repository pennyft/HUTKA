-- V10: споры (раздел 16.6, 21.4: Dispute(booking_id, decision, damage_amount, status)).
-- V9 занят миграцией V9__adminapi.sql (таблица admins), поэтому спорам достаётся V10.

CREATE TABLE disputes (
    id                   UUID PRIMARY KEY,
    booking_id           UUID          NOT NULL REFERENCES bookings (id),
    status               VARCHAR(16)   NOT NULL DEFAULT 'open',
    decision             VARCHAR(16)
        CHECK (decision IN ('renter_favor', 'partner_favor')),
    damage_amount        NUMERIC(10, 2),
    created_at           TIMESTAMPTZ   NOT NULL,
    resolved_at          TIMESTAMPTZ,
    resolved_by_admin_id UUID REFERENCES admins (id),
    -- по одной брони не бывает двух споров (эскалация одноразовая, bookings.escalated_at из V5): страховка на уровне БД
    CONSTRAINT uq_disputes_booking UNIQUE (booking_id),
    CONSTRAINT chk_disputes_state CHECK (
        (status = 'open' AND decision IS NULL AND damage_amount IS NULL
            AND resolved_at IS NULL AND resolved_by_admin_id IS NULL)
        OR
        (status = 'resolved' AND decision IS NOT NULL AND damage_amount IS NOT NULL
            AND damage_amount >= 0 AND resolved_at IS NOT NULL AND resolved_by_admin_id IS NOT NULL)
    )
);

-- очередь (открытые, старые первыми) и история решений
CREATE INDEX idx_disputes_status_created ON disputes (status, created_at);
CREATE INDEX idx_disputes_status_resolved ON disputes (status, resolved_at DESC);
