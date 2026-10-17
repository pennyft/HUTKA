package com.hutka.backend.ratings;

import java.util.UUID;

/** Сумма и количество оценок одной машины (проекция группового запроса, см. RatingCarStatsRepository). */
public interface CarRatingStats {
    UUID getCarId();

    Long getTotalScore();

    Long getRatingsCount();
}
