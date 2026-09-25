package com.hutka.backend.car.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CarMapMarkerResponse(
        UUID id,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal pricePerHour,
        String status
) {}
