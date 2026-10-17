package com.hutka.backend.grouptrips.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Участник в списке (8). displayName — «Иван П.»; ratingAvg публичен (7.1: оценки отображаются в профилях). */
public record ParticipantResponse(UUID userId, String displayName, BigDecimal ratingAvg, boolean organizer, Instant joinedAt) {}
