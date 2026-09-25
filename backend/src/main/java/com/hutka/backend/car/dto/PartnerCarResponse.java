package com.hutka.backend.car.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PartnerCarResponse(
        UUID id,
        String make,
        String model,
        Integer year,
        String plateNumber,
        Integer mileageKm,
        BigDecimal pricePerHour,
        List<String> photos,
        LocalDate inspectionExpiryDate,
        String bookingMode,
        String moderationStatus,
        String rejectionReason,
        String status,
        boolean hidden,
        Integer noShowStrikes,
        BigDecimal ratingAvg
) {}
