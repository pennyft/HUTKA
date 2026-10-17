package com.hutka.backend.auth.dto;

import jakarta.validation.constraints.Size;

/**
 * Раздел 2, 23.6: PATCH /users/me. Все поля необязательны, но хотя бы одно должно быть задано (проверяет UserService).
 * Email и дата рождения не редактируются.
 */
public record UpdateProfileRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 30) String phone
) {}
