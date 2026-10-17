-- V11: поддержка (раздел 14, 16.7, 21.4: Ticket(user_id, subject, description, category, priority, status, reopened_at)).
-- V10 занят спорами (V10__disputes.sql), поэтому поддержке достаётся V11.
-- Сверх 21.4 (обоснование — docs/SUPPORT_DECISIONS.md): audience, updated_at, awaiting_admin_since, first_admin_reply_at,
-- closed_at, closed_by_admin_id и таблица ticket_messages (переписка, 23.5).

CREATE TABLE tickets (
    id                   UUID PRIMARY KEY,
    -- NULL только у системного тикета (audience = 'system'), например автоскрытие машины по страйкам (6.5)
    user_id              UUID REFERENCES users (id),
    audience             VARCHAR(16)   NOT NULL
        CHECK (audience IN ('renter', 'partner', 'system')),
    subject              VARCHAR(200)  NOT NULL,
    description          VARCHAR(4000) NOT NULL,
    category             VARCHAR(16)   NOT NULL
        CHECK (category IN ('booking', 'payment', 'technical', 'dispute', 'other')),
    priority             VARCHAR(16)   NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('normal', 'urgent')),
    status               VARCHAR(16)   NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    created_at           TIMESTAMPTZ   NOT NULL,
    -- последняя активность (сообщение, закрытие, переоткрытие): порядок списка пользователя
    updated_at           TIMESTAMPTZ   NOT NULL,
    -- с какого момента тикет ждёт ответа администратора; NULL — ответ не требуется (16.7: порядок внутри уровня приоритета)
    awaiting_admin_since TIMESTAMPTZ,
    -- первый ответ администратора: статистика времени ответа (16.7)
    first_admin_reply_at TIMESTAMPTZ,
    -- момент закрытия: от него считается срок переоткрытия в 7 дней (14)
    closed_at            TIMESTAMPTZ,
    closed_by_admin_id   UUID REFERENCES admins (id),
    reopened_at          TIMESTAMPTZ,
    CONSTRAINT chk_tickets_owner CHECK ((audience = 'system') = (user_id IS NULL)),
    CONSTRAINT chk_tickets_state CHECK (
        (status = 'open' AND closed_at IS NULL AND closed_by_admin_id IS NULL)
        OR
        (status = 'closed' AND closed_at IS NOT NULL AND closed_by_admin_id IS NOT NULL
            AND awaiting_admin_since IS NULL)
    )
);

-- список тикетов пользователя: последняя активность сверху
CREATE INDEX idx_tickets_user_updated ON tickets (user_id, updated_at DESC);
-- очередь администратора: открытые, по приоритету и времени ожидания
CREATE INDEX idx_tickets_queue ON tickets (status, priority, awaiting_admin_since);
-- история закрытых
CREATE INDEX idx_tickets_closed ON tickets (status, closed_at DESC);
-- статистика времени ответа: выборка по created_at
CREATE INDEX idx_tickets_created ON tickets (created_at);

CREATE TABLE ticket_messages (
    id              UUID PRIMARY KEY,
    ticket_id       UUID          NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
    author_type     VARCHAR(8)    NOT NULL
        CHECK (author_type IN ('user', 'admin', 'ai')),
    author_user_id  UUID REFERENCES users (id),
    author_admin_id UUID REFERENCES admins (id),
    body            VARCHAR(4000) NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL,
    -- автор соответствует типу: пользователь, администратор или AI-помощник (без учётной записи)
    CONSTRAINT chk_ticket_messages_author CHECK (
        (author_type = 'user'  AND author_user_id IS NOT NULL AND author_admin_id IS NULL)
        OR (author_type = 'admin' AND author_admin_id IS NOT NULL AND author_user_id IS NULL)
        OR (author_type = 'ai'    AND author_user_id IS NULL AND author_admin_id IS NULL)
    )
);

CREATE INDEX idx_ticket_messages_ticket_created ON ticket_messages (ticket_id, created_at, id);
