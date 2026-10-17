package com.hutka.backend.ratings;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Формулы раздела 7.1 без БД и Spring. */
public final class RatingMath {

    private RatingMath() {}

    /**
     * rating_avg: простое среднее всех оценок (1–5) без взвешивания, округлённое до 1 знака,
     * «0,5 — в большую сторону» (HALF_UP). Нет оценок — null.
     */
    public static BigDecimal average(long totalScore, long ratingsCount) {
        if (ratingsCount <= 0) {
            return null;
        }
        return BigDecimal.valueOf(totalScore).divide(BigDecimal.valueOf(ratingsCount), 1, RoundingMode.HALF_UP);
    }

    /**
     * Правило «рейтинг ниже порога» действует только при достаточном числе оценок (по умолчанию 5);
     * до этого пользователь или машина считаются нейтральными. Сравнение — по округлённому до 1 знака значению.
     */
    public static boolean isBelowThreshold(BigDecimal averageRounded, long ratingsCount,
                                           BigDecimal threshold, int minRatingsCount) {
        if (averageRounded == null || ratingsCount < minRatingsCount) {
            return false;
        }
        return averageRounded.setScale(1, RoundingMode.HALF_UP).compareTo(threshold) < 0;
    }
}
