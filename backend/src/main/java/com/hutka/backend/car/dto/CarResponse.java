package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.enums.FuelType;
import com.hutka.backend.car.enums.Transmission;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CarResponse(
        UUID id,
        String make,
        String model,
        Integer year,
        Integer mileageKm,
        FuelType fuelType,
        Transmission transmission,
        Integer seats,
        String bodyType,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal pricePerHour,
        String description,
        List<String> photos,
        BookingMode bookingMode,
        CarStatus status,
        BigDecimal ratingAvg
) {}
