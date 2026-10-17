package com.hutka.backend.grouptrips.dto;

import java.util.List;

/**
 * GET /group-trips/:id/messages: total — всего сообщений в чате, items — страница, новые сверху (page = 0 — самые свежие).
 * Пока чат идёт, границы страниц сдвигаются: клиент убирает дубликаты по id.
 */
public record ChatMessageListResponse(long total, List<ChatMessageResponse> items) {}
