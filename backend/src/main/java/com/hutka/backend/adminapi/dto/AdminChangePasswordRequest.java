package com.hutka.backend.adminapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Максимум 72: BCrypt учитывает только первые 72 байта пароля. */
public record AdminChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 12, max = 72, message = "Пароль администратора — от 12 до 72 символов") String newPassword) {}
