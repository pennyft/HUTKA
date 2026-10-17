package com.hutka.backend.adminapi.dto;

import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Строка очереди тикетов и истории закрытых (16.7). userId и requesterName пусты у системного тикета (audience = system).
 * awaitingAdminSince — с какого момента тикет ждёт ответа; null — ответ не требуется или тикет закрыт.
 * closedAt заполнен только у закрытых.
 */
public record AdminTicketSummary(
        UUID id,
        UUID userId,
        String requesterName,
        TicketAudience audience,
        String subject,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant awaitingAdminSince,
        Instant closedAt) {}
