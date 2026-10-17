package com.hutka.backend.adminapi.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Строка «истории начисленных комиссий» (16.5): по какой брони, с какой суммы и по какому проценту удержано. */
public record CommissionItemResponse(UUID bookingId, UUID partnerId, BigDecimal amount, BigDecimal commissionPercent,
                                     BigDecimal commissionAmount, Instant chargedAt) {}
