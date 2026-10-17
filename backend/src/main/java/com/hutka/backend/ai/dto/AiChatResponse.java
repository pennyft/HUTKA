package com.hutka.backend.ai.dto;

import com.hutka.backend.ai.enums.AiChatStatus;

import java.util.List;

/**
 * Ответ POST /ai/chat. Всегда HTTP 200 (кроме ошибок валидации и авторизации): недоступность AI и исчерпанный лимит —
 * штатные состояния виджета (раздел 11), клиент различает их по status.
 * ticketDraft — предложение тикета: при unavailable / rate_limited всегда заполнен (путь к обычному тикету не теряется).
 * emergency — показать подсказку про экстренные службы (опасная ситуация в пути).
 */
public record AiChatResponse(
        AiChatStatus status,
        String reply,
        List<AiCarSuggestion> cars,
        AiCreatedTicket createdTicket,
        AiTicketDraft ticketDraft,
        boolean emergency) {}
