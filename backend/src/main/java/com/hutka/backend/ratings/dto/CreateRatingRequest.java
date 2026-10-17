package com.hutka.backend.ratings.dto;

import com.hutka.backend.ratings.enums.RatingTarget;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * POST /ratings (23.9). target = user — оценить вторую сторону поездки; target = car — оценить машину (только арендатор).
 * Арендатор оставляет две оценки по одной поездке (партнёру и машине), партнёр — одну (арендатору).
 */
public record CreateRatingRequest(
        @NotNull UUID bookingId,
        @NotNull RatingTarget target,
        @NotNull @Min(1) @Max(5) Integer score,
        @Size(max = 1000) String comment
) {}
