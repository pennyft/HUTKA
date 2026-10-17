package com.hutka.backend.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

/** POST /bookings (раздел 23.3). Время — ISO-8601 в UTC, например 2026-10-12T09:00:00Z. */
public record CreateBookingRequest(
        @NotNull UUID carId,
        @NotNull Instant plannedStartAt,
        @NotNull Instant plannedEndAt
) {}
