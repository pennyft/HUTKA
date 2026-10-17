package com.hutka.backend.adminapi.dto;

import com.hutka.backend.auth.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Строка списка пользователей (16.2). */
public record AdminUserSummary(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        VerificationStatus verificationStatus,
        boolean partner,
        boolean blocked,
        String blockedReason,
        BigDecimal ratingAvg,
        Instant createdAt) {}
