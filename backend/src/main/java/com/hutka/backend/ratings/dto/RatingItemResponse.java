package com.hutka.backend.ratings.dto;

import java.time.Instant;
import java.util.UUID;

/** Публичная оценка (7.1). Автор показывается только по имени. */
public record RatingItemResponse(UUID id, int score, String comment, Instant createdAt, String authorFirstName) {}
