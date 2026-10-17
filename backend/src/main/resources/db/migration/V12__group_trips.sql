-- V12: групповые поездки (раздел 8, 13, 21.4: GroupTrip(organizer_id, route, max_participants, date, status)).
-- V11 занят поддержкой (V11__support.sql). Сверх 21.4 (обоснование — docs/GROUPTRIPS_DECISIONS.md): статус cancelled,
-- таблицы group_trip_participants и group_trip_messages, служебные поля updated_at / closed_at / cancelled_at.
-- Колонка даты названа trip_date, а не date: date — имя типа и функции, в JPQL/HQL с ним лишние сюрпризы.

CREATE TABLE group_trips (
    id               UUID PRIMARY KEY,
    organizer_id     UUID         NOT NULL REFERENCES users (id),
    route            VARCHAR(300) NOT NULL,
    -- организатор входит в число участников (раздел 8: он тоже едет и сидит в чате)
    max_participants INTEGER      NOT NULL CHECK (max_participants BETWEEN 2 AND 50),
    trip_date        DATE         NOT NULL,
    -- 22.3: open | closed | finished; cancelled добавлен: «полная отмена» (8) должна где-то храниться, а удалять
    -- поездку нельзя — у участников остаются уведомление и история чата
    status           VARCHAR(16)  NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'finished', 'cancelled')),
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    closed_at        TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,
    CONSTRAINT chk_group_trips_closed CHECK (status <> 'closed' OR closed_at IS NOT NULL),
    CONSTRAINT chk_group_trips_cancelled CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);

-- общий список (open/closed от сегодняшней даты) и выборка sweeper'а
CREATE INDEX idx_group_trips_status_date ON group_trips (status, trip_date);
CREATE INDEX idx_group_trips_organizer ON group_trips (organizer_id);

CREATE TABLE group_trip_participants (
    id        UUID PRIMARY KEY,
    trip_id   UUID        NOT NULL REFERENCES group_trips (id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users (id),
    joined_at TIMESTAMPTZ NOT NULL,
    -- повторное присоединение невозможно на уровне БД (страховка поверх блокировки строки поездки)
    CONSTRAINT uq_group_trip_participant UNIQUE (trip_id, user_id)
);

-- «мои поездки»
CREATE INDEX idx_group_trip_participants_user ON group_trip_participants (user_id);

CREATE TABLE group_trip_messages (
    id         UUID PRIMARY KEY,
    trip_id    UUID          NOT NULL REFERENCES group_trips (id) ON DELETE CASCADE,
    sender_id  UUID          NOT NULL REFERENCES users (id),
    body       VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL
);

-- история чата: новые сверху, страницами (GET /group-trips/:id/messages)
CREATE INDEX idx_group_trip_messages_trip_created ON group_trip_messages (trip_id, created_at DESC, id DESC);
