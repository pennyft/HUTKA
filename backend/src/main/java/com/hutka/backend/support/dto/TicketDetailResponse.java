package com.hutka.backend.support.dto;

import com.hutka.backend.support.Ticket;
import com.hutka.backend.support.TicketMessage;
import com.hutka.backend.support.TicketRules;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** GET /tickets/:id (23.5): тикет с перепиской. Первое сообщение — description, дальше messages по времени. */
public record TicketDetailResponse(
        UUID id,
        TicketAudience audience,
        String subject,
        String description,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant closedAt,
        Instant reopenedAt,
        boolean canReopen,
        Instant reopenableUntil,
        List<TicketMessageResponse> messages) {

    public static TicketDetailResponse from(Ticket t, List<TicketMessage> messages, Instant now) {
        return new TicketDetailResponse(t.getId(), t.getAudience(), t.getSubject(), t.getDescription(), t.getCategory(),
                t.getPriority(), t.getStatus(), t.getCreatedAt(), t.getUpdatedAt(), t.getClosedAt(), t.getReopenedAt(),
                TicketRules.canReopen(t.getClosedAt(), now),
                t.getClosedAt() == null ? null : TicketRules.reopenDeadline(t.getClosedAt()),
                messages.stream().map(TicketMessageResponse::from).toList());
    }
}
