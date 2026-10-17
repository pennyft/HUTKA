package com.hutka.backend.adminapi.dto;

import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.enums.FuelType;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.car.enums.Transmission;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record AdminCarResponse(
        UUID id,
        UUID partnerId,
        String partnerName,
        String partnerEmail,
        String make,
        String model,
        Integer year,
        String plateNumber,
        Integer mileageKm,
        FuelType fuelType,
        Transmission transmission,
        Integer seats,
        String bodyType,
        String address,
        BigDecimal pricePerHour,
        String description,
        List<String> photos,
        String techPassportNumber,
        String insurancePolicyNumber,
        LocalDate inspectionExpiryDate,
        BookingMode bookingMode,
        ModerationStatus moderationStatus,
        String rejectionReason,
        CarStatus status,
        boolean hidden,
        boolean hiddenByStrikes,
        int noShowStrikes,
        Instant createdAt,
        boolean hiddenByAdmin,
        String hiddenByAdminReason) {}
