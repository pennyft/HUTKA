package com.hutka.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

public record LicenseRequest(
        @NotBlank String licenseNumber,
        @NotNull @PastOrPresent LocalDate licenseIssueDate
) {}