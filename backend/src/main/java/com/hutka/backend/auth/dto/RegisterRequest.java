package com.hutka.backend.auth.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record  RegisterRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 30) String phone,
        @NotNull @Past LocalDate birthDate,
        @NotBlank @Size(min = 8, max = 72) String password
) {}
