package com.hutka.backend.adminapi.dto;

import com.hutka.backend.auth.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Профиль пользователя для администратора (16.2): данные, статус блокировки, сводка по арендам и последние оценки.
 * Полная история аренд — GET /admin/bookings?userId=…, все оценки — GET /admin/users/:id/ratings.
 */
public record AdminUserDetailResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        boolean emailVerified,
        String phone,
        LocalDate birthDate,
        VerificationStatus verificationStatus,
        String licenseNumber,
        LocalDate licenseIssueDate,
        String licenseRejectionReason,
        boolean partner,
        boolean blocked,
        String blockedReason,
        Instant blockedAt,
        UUID blockedByAdminId,
        BigDecimal ratingAvg,
        Instant createdAt,
        Stats stats,
        List<AdminRatingItem> recentRatings) {

    /** bookings* — аренды пользователя как арендатора; carsCount — число его машин (для партнёра). */
    public record Stats(long bookingsTotal, long bookingsFinished, long bookingsCancelled, long carsCount,
                        long ratingsCount) {}
}
