package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.enums.ModerationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * description, availabilitySchedule и serviceHistory возвращаются, чтобы форма правки показывала текущие значения.
 * availabilitySchedule и serviceHistory — JSON-строки в том же виде, в каком их принимает UpdateCarRequest.
 */
public record PartnerCarResponse(
        UUID id,
        String make,
        String model,
        Integer year,
        String plateNumber,
        Integer mileageKm,
        String address,
        BigDecimal pricePerHour,
        List<String> photos,
        LocalDate inspectionExpiryDate,
        BookingMode bookingMode,
        ModerationStatus moderationStatus,
        String rejectionReason,
        CarStatus status,
        boolean hidden,
        boolean hiddenByStrikes,
        boolean hiddenByAdmin,
        Integer noShowStrikes,
        BigDecimal ratingAvg,
        BigDecimal monthIncome,
        String description,
        String availabilitySchedule,
        String serviceHistory
) {}
