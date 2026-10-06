CREATE TABLE cars (
                      id                      UUID PRIMARY KEY,
                      partner_id              UUID           NOT NULL REFERENCES users (id),
                      make                    VARCHAR(255)   NOT NULL,
                      model                   VARCHAR(255)   NOT NULL,
                      year                    INTEGER        NOT NULL,
                      plate_number            VARCHAR(255)   NOT NULL,
                      mileage_km              INTEGER        NOT NULL,
                      fuel_type               VARCHAR(255)   NOT NULL,
                      transmission            VARCHAR(255)   NOT NULL,
                      seats                   INTEGER        NOT NULL,
                      body_type               VARCHAR(255)   NOT NULL,
                      address                 VARCHAR(255)   NOT NULL,
                      latitude                NUMERIC(10, 7),
                      longitude               NUMERIC(10, 7),
                      price_per_hour          NUMERIC(10, 2) NOT NULL,
                      description             VARCHAR(2000),
                      tech_passport_number    VARCHAR(255)   NOT NULL,
                      insurance_policy_number VARCHAR(255)   NOT NULL,
                      inspection_expiry_date  DATE           NOT NULL,
                      availability_schedule   JSONB,
                      booking_mode            VARCHAR(255)   NOT NULL,
                      moderation_status       VARCHAR(255)   NOT NULL DEFAULT 'pending',
                      rejection_reason        VARCHAR(255),
                      status                  VARCHAR(255)   NOT NULL DEFAULT 'available',
                      is_hidden               BOOLEAN        NOT NULL DEFAULT FALSE,
                      no_show_strikes         INTEGER        NOT NULL DEFAULT 0,
                      service_history         JSONB,
                      rating_avg              NUMERIC(3, 2),
                      created_at              TIMESTAMPTZ    NOT NULL
);

CREATE INDEX idx_cars_partner_id ON cars (partner_id);
CREATE INDEX idx_cars_catalog ON cars (moderation_status, is_hidden);
CREATE TABLE car_photos (
                            car_id UUID          NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
                            url    VARCHAR(1024) NOT NULL
);

CREATE INDEX idx_car_photos_car_id ON car_photos (car_id);