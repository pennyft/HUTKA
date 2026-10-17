package com.hutka.backend.adminapi.dto;

/**
 * Статистика поддержки (16.7). Счётчики — по состоянию «сейчас». Время первого ответа — по тикетам пользователей,
 * созданным за последние windowDays дней и уже получившим ответ администратора; null, если таких нет.
 */
public record AdminTicketStatsResponse(
        long openTotal,
        long openUrgent,
        long awaitingAnswer,
        int windowDays,
        long answeredInWindow,
        Double avgFirstResponseSeconds,
        Double medianFirstResponseSeconds) {}
