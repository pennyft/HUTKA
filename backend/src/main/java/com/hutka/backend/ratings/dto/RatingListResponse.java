package com.hutka.backend.ratings.dto;

import java.math.BigDecimal;
import java.util.List;

/** GET /ratings (23.9). averageRating — по ВСЕМ оценкам (формула 7.1), null если оценок нет; ratings — одна страница. */
public record RatingListResponse(BigDecimal averageRating, long ratingsCount, List<RatingItemResponse> ratings) {}
