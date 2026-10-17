package com.hutka.backend.ratings;

import com.hutka.backend.car.service.CarRatingsPort;
import com.hutka.backend.settings.PlatformSettings;
import com.hutka.backend.settings.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Реализация порта car → ratings (раздел 7.1). Те же формулы и настройки (порог, минимум оценок), что и в RatingPolicy:
 * среднее считается из таблицы оценок и округляется до 1 знака (HALF_UP), сравнение с порогом — по округлённому значению.
 */
@Component
@RequiredArgsConstructor
public class RatingCarRatingsPort implements CarRatingsPort {

    /** Ограничение на число значений в IN (...) за один запрос. */
    private static final int CHUNK_SIZE = 500;

    private final RatingCarStatsRepository stats;
    private final PlatformSettingsService settings;

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, CarRating> ratingsFor(Collection<UUID> carIds) {
        if (carIds.isEmpty()) {
            return Map.of();
        }
        PlatformSettings cfg = settings.get();
        Map<UUID, CarRating> result = new HashMap<>();
        List<UUID> ids = new ArrayList<>(carIds);
        for (int from = 0; from < ids.size(); from += CHUNK_SIZE) {
            List<UUID> chunk = ids.subList(from, Math.min(from + CHUNK_SIZE, ids.size()));
            for (CarRatingStats row : stats.statsForCars(chunk)) {
                long count = row.getRatingsCount() == null ? 0 : row.getRatingsCount();
                long total = row.getTotalScore() == null ? 0 : row.getTotalScore();
                BigDecimal average = RatingMath.average(total, count);
                result.put(row.getCarId(), new CarRating(average, count,
                        count >= cfg.getMinRatingsCount(),
                        RatingMath.isBelowThreshold(average, count, cfg.getMinRatingThreshold(), cfg.getMinRatingsCount())));
            }
        }
        return result;
    }
}
