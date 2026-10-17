package com.hutka.backend.adminapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Причина административного действия: блокировка пользователя (16.2), принудительное скрытие машины (16.3). */
public record ReasonRequest(@NotBlank(message = "Укажите причину") @Size(max = 500) String reason) {}
