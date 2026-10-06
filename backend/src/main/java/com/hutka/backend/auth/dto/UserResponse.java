package com.hutka.backend.auth.dto;

import com.hutka.backend.auth.enums.VerificationStatus;

import java.time.LocalDate;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        boolean emailVerified,
        String phone,
        LocalDate birthDate,
        VerificationStatus verificationStatus,
        boolean isPartner
) {}
