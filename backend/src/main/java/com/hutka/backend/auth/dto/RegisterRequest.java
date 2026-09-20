package com.hutka.backend.auth.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;


public record RegisterRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank @Email String email,
    @NotBlank String phone,
    @NotBlank @Past LocalDate birthDate,
    @NotBlank @Size(min=8) String password
){}