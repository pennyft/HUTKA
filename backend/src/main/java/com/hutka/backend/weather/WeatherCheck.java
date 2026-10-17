package com.hutka.backend.weather;

import com.hutka.backend.weather.enums.WeatherCheckKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Отметка «погода по этой брони проверена» (12). Пара (booking_id, kind) уникальна: повторный запуск задачи Quartz
 * или два параллельных запуска не отправят уведомление дважды. hazards — имена условий через запятую
 * (пусто, если погода приемлемая), notified — создано ли уведомление.
 */
@Entity
@Table(name = "weather_checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeatherCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private WeatherCheckKind kind;

    @Column(name = "checked_at", nullable = false, updatable = false)
    private Instant checkedAt;

    @Column(nullable = false, length = 200)
    private String hazards;

    @Column(nullable = false)
    private boolean notified;

    @PrePersist
    void prePersist() {
        if (checkedAt == null) checkedAt = Instant.now();
        if (hazards == null) hazards = "";
    }
}
