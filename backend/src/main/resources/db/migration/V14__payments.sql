-- V14: платежи и выплаты (раздел 15, 10.6, 16.5, 21.4: Payout(partner_id, period_start, period_end, amount,
-- commission_deducted, status, paid_at)). V13 занят погодой (V13__weather_checks.sql) — если вы её не подключали,
-- переименуйте файл под ваш следующий свободный номер. Сверх 21.4 (обоснование — docs/PAYMENTS_DECISIONS.md):
-- таблица payments с разделением суммы и счётчиком попыток, служебные поля выплаты. Валюта — BYN.

CREATE TABLE payouts (
    id                  UUID PRIMARY KEY,
    partner_id          UUID           NOT NULL REFERENCES users (id),
    -- даты (включительно) самого раннего и самого позднего платежа, вошедшего в выплату
    period_start        DATE           NOT NULL,
    period_end          DATE           NOT NULL,
    -- сумма партнёру за вычетом комиссии; commission_deducted — комиссия, удержанная с вошедших в выплату поездок
    amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    commission_deducted NUMERIC(12, 2) NOT NULL CHECK (commission_deducted >= 0),
    currency            VARCHAR(3)     NOT NULL,
    status              VARCHAR(16)    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    attempts            INTEGER        NOT NULL DEFAULT 0,
    provider_ref        VARCHAR(100),
    failure_reason      VARCHAR(300),
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ    NOT NULL,
    updated_at          TIMESTAMPTZ    NOT NULL,
    CONSTRAINT chk_payouts_period CHECK (period_end >= period_start),
    CONSTRAINT chk_payouts_paid CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);

-- история выплат партнёра (GET /partner/payouts), новые сверху
CREATE INDEX idx_payouts_partner_created ON payouts (partner_id, created_at DESC);
-- повторы выплат в pending и админский список по статусу
CREATE INDEX idx_payouts_status_updated ON payouts (status, updated_at);

CREATE TABLE payments (
    id                 UUID PRIMARY KEY,
    booking_id         UUID           NOT NULL REFERENCES bookings (id),
    partner_id         UUID           NOT NULL REFERENCES users (id),
    renter_id          UUID           NOT NULL REFERENCES users (id),
    -- сейчас только списание за поездку; залог (15) добавится новыми значениями
    kind               VARCHAR(24)    NOT NULL CHECK (kind IN ('trip_charge')),
    status             VARCHAR(16)    NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
    amount             NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    -- разделение суммы фиксируется при создании платежа; процент — снимок commission_percent на тот момент
    commission_percent NUMERIC(5, 2)  NOT NULL CHECK (commission_percent BETWEEN 0 AND 100),
    commission_amount  NUMERIC(12, 2) NOT NULL CHECK (commission_amount >= 0),
    partner_amount     NUMERIC(12, 2) NOT NULL CHECK (partner_amount >= 0),
    currency           VARCHAR(3)     NOT NULL,
    provider           VARCHAR(20)    NOT NULL,
    provider_ref       VARCHAR(100),
    failure_reason     VARCHAR(300),
    attempts           INTEGER        NOT NULL DEFAULT 0,
    -- пусто, пока деньги партнёра не включены в выплату
    payout_id          UUID REFERENCES payouts (id),
    created_at         TIMESTAMPTZ    NOT NULL,
    updated_at         TIMESTAMPTZ    NOT NULL,
    -- по одной брони — одно списание: страховка от двойного списания поверх логики сервиса
    CONSTRAINT uq_payments_booking_kind UNIQUE (booking_id, kind),
    CONSTRAINT chk_payments_split CHECK (commission_amount + partner_amount = amount),
    -- в выплату попадают только успешные платежи
    CONSTRAINT chk_payments_payout CHECK (payout_id IS NULL OR status = 'succeeded')
);

-- баланс партнёра и сбор выплат: успешные платежи партнёра, не вошедшие в выплату
CREATE INDEX idx_payments_partner_unpaid ON payments (partner_id, created_at) WHERE payout_id IS NULL AND status = 'succeeded';
-- состав выплаты (детализация)
CREATE INDEX idx_payments_payout ON payments (payout_id) WHERE payout_id IS NOT NULL;
-- повторы неудачных и зависших платежей
CREATE INDEX idx_payments_status_updated ON payments (status, updated_at);
-- отчёты 16.5 по периоду
CREATE INDEX idx_payments_created ON payments (created_at);
