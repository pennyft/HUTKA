package com.hutka.backend.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Реплика истории чата сессии (раздел 11). Роль system от клиента не принимается — иначе клиент мог бы подменить инструкции. */
public record AiHistoryItem(
        @NotBlank @Pattern(regexp = "user|assistant", message = "Роль: user или assistant") String role,
        @NotBlank @Size(max = 2000, message = "Реплика не длиннее 2000 символов") String content) {}
