package com.hutka.backend.ratings.service;

import com.hutka.backend.booking.service.RenterRatingGate;
import com.hutka.backend.ratings.RatingMath;
import com.hutka.backend.ratings.RatingRepository;
import com.hutka.backend.ratings.RatingStats;
import com.hutka.backend.settings.PlatformSettings;
import com.hutka.backend.settings.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Правила на основе рейтинга (раздел 7.1). Порог и минимум оценок берутся из PlatformSettings (16.9),
 * среднее считается заново из таблицы оценок, а не читается из кэширующего поля rating_avg.
 */
@Service
@RequiredArgsConstructor
public class RatingPolicy implements RenterRatingGate {

    private final RatingRepository ratings;
    private final PlatformSettingsService settings;

    /** Арендатор с рейтингом ниже порога (при достаточном числе оценок) — бронирование недоступно. */
    @Override
    @Transactional(readOnly = true)
    public boolean isBookingBlocked(UUID renterId) {
        return isBelowThreshold(ratings.statsForUser(renterId));
    }

    /**
     * Машина с рейтингом ниже порога выпадает из топа выдачи, но остаётся доступной для бронирования (7.1).
     * Метод готов для сортировки каталога в пакете car.
     */
    @Transactional(readOnly = true)
    public boolean isCarBelowThreshold(UUID carId) {
        return isBelowThreshold(ratings.statsForCar(carId));
    }

    private boolean isBelowThreshold(RatingStats stats) {
        PlatformSettings cfg = settings.get();
        long count = stats.getRatingsCount() == null ? 0 : stats.getRatingsCount();
        long total = stats.getTotalScore() == null ? 0 : stats.getTotalScore();
        return RatingMath.isBelowThreshold(RatingMath.average(total, count), count,
                cfg.getMinRatingThreshold(), cfg.getMinRatingsCount());
    }
}
