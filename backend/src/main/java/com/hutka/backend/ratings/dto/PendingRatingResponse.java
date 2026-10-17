package com.hutka.backend.ratings.dto;

import com.hutka.backend.ratings.enums.RatingTarget;

import java.time.Instant;
import java.util.UUID;

public record PendingRatingResponse(UUID bookingId, UUID carId, RatingTarget target, Instant finishedAt) {}
