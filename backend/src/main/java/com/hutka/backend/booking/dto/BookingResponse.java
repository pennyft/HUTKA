package com.hutka.backend.booking.dto;

import com.hutka.backend.booking.enums.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 23.3: детали брони — фото до/после, статус, стоимость (6.2, 6.3).
 * renterName — имя арендатора (только имя, без фамилии); заполняется только в списке броней партнёра
 * (GET /partner/bookings), в остальных ответах null.
 */
public record BookingResponse(
        UUID id,
        UUID renterId,
        UUID carId,
        BookingStatus status,
        Instant plannedStartAt,
        Instant plannedEndAt,
        Instant actualStartAt,
        Instant actualEndAt,
        List<String> photosBefore,
        List<String> photosAfter,
        BigDecimal pricePerHour,
        BigDecimal priceEstimate,
        BigDecimal finalPrice,
        boolean pddDiscountApplied,
        BigDecimal discountAmount,
        BigDecimal overdueHours,
        Instant confirmedAt,
        String declineReason,
        Instant createdAt,
        String renterName
) {}
