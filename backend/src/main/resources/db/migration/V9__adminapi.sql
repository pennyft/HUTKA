-- V9: административная панель (раздел 16, 17.1). Номер V9 — предположение (после V8__notifications); при конфликте
-- переименуйте файл в следующий свободный номер.

-- Администраторы: отдельная таблица (контур персонала отделён от users). Заполняется вручную: docs/seed_admins.sql
CREATE TABLE admins (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT chk_admins_email_lower CHECK (email = lower(email))
);

-- Причина отклонения водительского удостоверения (раздел 3.2); в разделе 21.1 такого поля нет
ALTER TABLE users ADD COLUMN license_rejection_reason VARCHAR(500);

-- platform_settings.updated_by_admin_id создан в V7 без ссылки (таблицы admins ещё не было); все значения сейчас NULL
ALTER TABLE platform_settings
    ADD CONSTRAINT fk_platform_settings_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admins (id);
