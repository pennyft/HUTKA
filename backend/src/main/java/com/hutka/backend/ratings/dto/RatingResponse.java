package com.hutka.backend.ratings.dto;

import com.hutka.backend.ratings.enums.RatingTarget;

import java.time.Instant;
import java.util.UUID;

public record RatingResponse(UUID id, UUID bookingId, RatingTarget target, int score, String comment, Instant createdAt) {}
