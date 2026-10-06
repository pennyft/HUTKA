package com.hutka.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record LicenseRequest(
        @NotBlank @Size(max = 32) String licenseNumber,
        @NotNull @PastOrPresent LocalDate licenseIssueDate
) {}
