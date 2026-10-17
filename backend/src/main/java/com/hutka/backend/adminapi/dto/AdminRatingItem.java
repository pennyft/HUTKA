package com.hutka.backend.adminapi.dto;

import java.time.Instant;
import java.util.UUID;

/** Оценка в профиле пользователя для администратора (16.2): автор виден полностью, toCarId заполнен для оценки машины. */
public record AdminRatingItem(UUID id, UUID bookingId, UUID fromUserId, String authorName, UUID toCarId, int score,
                              String comment, Instant createdAt) {}
