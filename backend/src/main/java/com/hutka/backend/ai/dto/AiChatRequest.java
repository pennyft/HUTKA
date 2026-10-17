package com.hutka.backend.ai.dto;

import com.hutka.backend.ai.enums.AiCabinet;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * POST /ai/chat (23.11). Контекст по разделу 11: роль (cabinet), текущая страница (page), история чата сессии (history).
 * История хранится на клиенте и присылается целиком; сервер оставляет последние реплики (AiRules.MAX_HISTORY).
 */
public record AiChatRequest(
        @NotBlank(message = "Введите сообщение") @Size(max = 2000, message = "Сообщение не длиннее 2000 символов") String message,
        @Size(max = 100, message = "page не длиннее 100 символов") String page,
        AiCabinet cabinet,
        @Size(max = 40, message = "Слишком длинная история") @Valid List<AiHistoryItem> history) {}
