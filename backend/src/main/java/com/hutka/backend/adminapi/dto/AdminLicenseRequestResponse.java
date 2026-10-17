package com.hutka.backend.adminapi.dto;

import com.hutka.backend.auth.enums.VerificationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AdminLicenseRequestResponse(
        UUID userId,
        String firstName,
        String lastName,
        String email,
        String phone,
        LocalDate birthDate,
        String licenseNumber,
        LocalDate licenseIssueDate,
        VerificationStatus verificationStatus,
        String licenseRejectionReason,
        Instant registeredAt) {}
