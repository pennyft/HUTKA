package com.hutka.backend.adminapi.dto;

import com.hutka.backend.booking.enums.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Строка списка бронирований для администратора (16.4). escalated — просрочка эскалирована в «Споры» (6.3). */
public record AdminBookingSummary(
        UUID id,
        BookingStatus status,
        Party renter,
        CarRef car,
        Party partner,
        Instant plannedStartAt,
        Instant plannedEndAt,
        Instant actualStartAt,
        Instant actualEndAt,
        BigDecimal priceEstimate,
        BigDecimal finalPrice,
        boolean escalated,
        Instant createdAt) {

    public record Party(UUID id, String name, String email, String phone) {}

    public record CarRef(UUID id, String name, String plateNumber) {}
}
