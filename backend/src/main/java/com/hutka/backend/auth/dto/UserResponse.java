package com.hutka.backend.auth.dto;

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
        String verificationStatus,
        boolean isPartner
) {}