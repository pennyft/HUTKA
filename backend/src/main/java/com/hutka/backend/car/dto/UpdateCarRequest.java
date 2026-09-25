package com.hutka.backend.car.dto;

import java.math.BigDecimal;
import java.util.List;

public record UpdateCarRequest(
        String description,
        BigDecimal pricePerHour,
        List<String> photos,
        String availabilitySchedule,
        String bookingMode
) {}
