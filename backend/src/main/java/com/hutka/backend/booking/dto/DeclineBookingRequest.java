package com.hutka.backend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /bookings/:id/decline. Раздел 10.4: отклонение — с указанием причины. */
public record DeclineBookingRequest(
        @NotBlank @Size(max = 255) String reason
) {}
