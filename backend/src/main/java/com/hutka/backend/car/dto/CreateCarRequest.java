package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.FuelType;
import com.hutka.backend.car.enums.Transmission;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Координаты в запросе не принимаются: они вычисляются на сервере по адресу (раздел 4.2).
 */
public record CreateCarRequest(
        @NotBlank @Size(max = 64) String make,
        @NotBlank @Size(max = 64) String model,
        @NotNull Integer year,
        @NotBlank @Size(max = 16) String plateNumber,
        @NotNull @PositiveOrZero Integer mileageKm,
        @NotNull FuelType fuelType,
        @NotNull Transmission transmission,
        @NotNull @Positive @Max(20) Integer seats,
        @NotBlank @Size(max = 64) String bodyType,
        @NotBlank @Size(max = 255) String address,
        @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal pricePerHour,
        @Size(max = 2000) String description,
        @NotNull @Size(min = 5, message = "Минимум 5 фотографий") List<@NotBlank String> photos,
        @NotBlank @Size(max = 64) String techPassportNumber,
        @NotBlank @Size(max = 64) String insurancePolicyNumber,
        @NotNull LocalDate inspectionExpiryDate,
        String availabilitySchedule,
        @NotNull BookingMode bookingMode
) {}
