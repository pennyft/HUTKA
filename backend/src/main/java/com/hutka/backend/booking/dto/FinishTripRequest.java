package com.hutka.backend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** POST /bookings/:id/finish (23.3). Раздел 6.2: без фото «после» завершить поездку нельзя. */
public record FinishTripRequest(
        @NotEmpty(message = "Без фото «после» нельзя завершить поездку")
        @Size(max = 20) List<@NotBlank @Size(max = 1024) String> photosAfter
) {}
