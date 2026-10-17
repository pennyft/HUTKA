package com.hutka.backend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** POST /bookings/:id/start (23.3). Раздел 6.2: без фото «до» поездку начать нельзя. */
public record StartTripRequest(
        @NotEmpty(message = "Без фото «до» нельзя начать поездку")
        @Size(max = 20) List<@NotBlank @Size(max = 1024) String> photosBefore
) {}
