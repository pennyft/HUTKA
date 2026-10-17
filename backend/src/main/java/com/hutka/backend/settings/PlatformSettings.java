package com.hutka.backend.settings;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Раздел 16.9, 21. Единственная строка (id = 1), создаётся миграцией V7.
 * Используется: рейтинги (7.1 — порог и минимум оценок), позже payments (комиссия 20%) и adminapi (редактирование).
 */
@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSettings {

    public static final int SINGLETON_ID = 1;

    @Id
    private Integer id;

    @Column(name = "commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPercent;

    /** Раздел 7.1: порог рейтинга, по умолчанию 4.0. */
    @Column(name = "min_rating_threshold", nullable = false, precision = 3, scale = 2)
    private BigDecimal minRatingThreshold;

    /** Раздел 7.1: правило «ниже порога» действует от этого числа оценок, по умолчанию 5. */
    @Column(name = "min_ratings_count", nullable = false)
    private int minRatingsCount;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by_admin_id")
    private UUID updatedByAdminId;
}
