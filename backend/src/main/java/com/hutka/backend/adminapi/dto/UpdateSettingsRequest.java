package com.hutka.backend.adminapi.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

/** PATCH: меняются только переданные поля. Границы — из смысла параметров (раздел 7.1, 16.9); в ТЗ они не заданы. */
public record UpdateSettingsRequest(
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal commissionPercent,
        @DecimalMin("1.00") @DecimalMax("5.00") BigDecimal minRatingThreshold,
        @Min(1) Integer minRatingsCount) {}
