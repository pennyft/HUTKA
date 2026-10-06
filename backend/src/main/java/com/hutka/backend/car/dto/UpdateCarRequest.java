package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.BookingMode;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/** Раздел 10.3. Поля, равные null, не изменяются. */
public record UpdateCarRequest(
        @Size(max = 2000) String description,
        @Positive @Digits(integer = 8, fraction = 2) BigDecimal pricePerHour,
        @Size(min = 5, message = "Минимум 5 фотографий") List<@NotBlank String> photos,
        @Size(max = 255) String address,
        String availabilitySchedule,
        BookingMode bookingMode,
        String serviceHistory
) {}
