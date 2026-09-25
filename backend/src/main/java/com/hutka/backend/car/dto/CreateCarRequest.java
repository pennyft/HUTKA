package com.hutka.backend.car.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateCarRequest(
        @NotBlank String make,
        @NotBlank String model,
        @NotNull Integer year,
        @NotBlank String plateNumber,
        @NotNull @PositiveOrZero Integer mileageKm,
        @NotBlank String fuelType,
        @NotBlank String transmission,
        @NotNull @Positive Integer seats,
        @NotBlank String bodyType,
        @NotBlank String address,
        BigDecimal latitude,
        BigDecimal longitude,
        @NotNull @Positive BigDecimal pricePerHour,
        String description,
        @NotNull @Size(min = 5, message = "Минимум 5 фотографий") List<@NotBlank String> photos,
        @NotBlank String techPassportNumber,
        @NotBlank String insurancePolicyNumber,
        @NotNull LocalDate inspectionExpiryDate,
        String availabilitySchedule,
        @NotBlank String bookingMode
) {}
