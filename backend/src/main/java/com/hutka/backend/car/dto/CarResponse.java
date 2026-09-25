package com.hutka.backend.car.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CarResponse(
        UUID id,
        String make,
        String model,
        Integer year,
        Integer mileageKm,
        String fuelType,
        String transmission,
        Integer seats,
        String bodyType,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal pricePerHour,
        String description,
        List<String> photos,
        String bookingMode,
        String status,
        BigDecimal ratingAvg
) {}
