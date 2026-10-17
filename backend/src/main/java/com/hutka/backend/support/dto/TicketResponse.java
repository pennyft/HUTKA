package com.hutka.backend.support.dto;

import com.hutka.backend.support.Ticket;
import com.hutka.backend.support.TicketRules;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Строка списка GET /tickets. canReopen — серверное решение (срок 7 дней, 14), reopenableUntil — крайний срок
 * (null, если тикет не закрыт).
 */
public record TicketResponse(
        UUID id,
        TicketAudience audience,
        String subject,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant closedAt,
        Instant reopenedAt,
        boolean canReopen,
        Instant reopenableUntil) {

    public static TicketResponse from(Ticket t, Instant now) {
        return new TicketResponse(t.getId(), t.getAudience(), t.getSubject(), t.getCategory(), t.getPriority(), t.getStatus(),
                t.getCreatedAt(), t.getUpdatedAt(), t.getClosedAt(), t.getReopenedAt(),
                TicketRules.canReopen(t.getClosedAt(), now),
                t.getClosedAt() == null ? null : TicketRules.reopenDeadline(t.getClosedAt()));
    }
}
