package com.hutka.backend.adminapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Раздел 3.2, 9.3: отклонение — всегда с причиной. */
public record RejectRequest(@NotBlank(message = "Укажите причину") @Size(max = 500) String reason) {}
