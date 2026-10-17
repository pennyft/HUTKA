package com.hutka.backend.adminapi.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminSettingsResponse(
        BigDecimal commissionPercent,
        BigDecimal minRatingThreshold,
        int minRatingsCount,
        Instant updatedAt,
        UUID updatedByAdminId) {}
