package com.hutka.backend.adminapi.dto;

import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.disputes.enums.DisputeDecision;
import com.hutka.backend.disputes.enums.DisputeStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Карточка спора для решения (16.6): стороны, машина, бронь с фото до/после и временная шкала.
 * Переписки (тикеты поддержки) здесь пока нет — пакета support ещё нет, см. docs/DISPUTES_DECISIONS.md.
 */
public record AdminDisputeDetailResponse(
        UUID id,
        DisputeStatus status,
        DisputeDecision decision,
        BigDecimal damageAmount,
        Instant createdAt,
        Instant resolvedAt,
        UUID resolvedByAdminId,
        Party renter,
        Party partner,
        CarInfo car,
        BookingInfo booking,
        List<TimelineEvent> timeline) {

    public record Party(UUID id, String name, String email, String phone) {}

    public record CarInfo(UUID id, String make, String model, String plateNumber, CarStatus status) {}

    public record BookingInfo(
            UUID id,
            BookingStatus status,
            Instant plannedStartAt,
            Instant plannedEndAt,
            Instant actualStartAt,
            Instant actualEndAt,
            Instant escalatedAt,
            List<String> photosBefore,
            List<String> photosAfter,
            BigDecimal pricePerHour,
            BigDecimal priceEstimate,
            BigDecimal finalPrice,
            BigDecimal discountAmount,
            BigDecimal overdueHours,
            String declineReason) {}

    /** event: booking_created, booking_confirmed, trip_started, dispute_opened, trip_finished, dispute_resolved. */
    public record TimelineEvent(String event, Instant at) {}
}
