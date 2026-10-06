package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.CarStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record CarMapMarkerResponse(
        UUID id,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal pricePerHour,
        CarStatus status
) {}
