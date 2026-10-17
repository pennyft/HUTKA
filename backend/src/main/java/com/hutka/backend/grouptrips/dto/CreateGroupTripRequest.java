package com.hutka.backend.grouptrips.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** POST /group-trips (23.5, 8): маршрут, максимальное число участников (включая организатора), дата поездки (yyyy-MM-dd). */
public record CreateGroupTripRequest(
        @NotBlank(message = "Укажите маршрут") @Size(max = 300, message = "Маршрут не длиннее 300 символов") String route,
        @NotNull(message = "Укажите максимальное число участников") Integer maxParticipants,
        @NotNull(message = "Укажите дату поездки") LocalDate date) {}
