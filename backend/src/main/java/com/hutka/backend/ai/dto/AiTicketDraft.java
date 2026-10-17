package com.hutka.backend.ai.dto;

/**
 * Черновик тикета. category — booking | payment | technical | dispute | other; priority — normal | urgent (раздел 14).
 * Возвращается клиенту, когда AI предлагает тикет (11.1) или сам AI недоступен (11): кнопка отправляет его в POST /tickets.
 */
public record AiTicketDraft(String category, String priority, String subject, String description) {}
