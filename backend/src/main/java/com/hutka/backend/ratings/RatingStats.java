package com.hutka.backend.ratings;

/** Сумма и количество оценок получателя (проекция JPQL-запроса). */
public interface RatingStats {
    Long getTotalScore();

    Long getRatingsCount();
}
