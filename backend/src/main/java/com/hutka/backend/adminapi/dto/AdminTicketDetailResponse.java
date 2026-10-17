package com.hutka.backend.adminapi.dto;

import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketAuthorType;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Карточка тикета для администратора (16.7): автор обращения, тема и описание, вся переписка с именами авторов.
 * requester пуст у системного тикета. authorName у сообщения AI пуст — клиент подписывает по authorType.
 */
public record AdminTicketDetailResponse(
        UUID id,
        TicketAudience audience,
        Requester requester,
        String subject,
        String description,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant awaitingAdminSince,
        Instant firstAdminReplyAt,
        Instant closedAt,
        UUID closedByAdminId,
        String closedByAdminName,
        Instant reopenedAt,
        List<Message> messages) {

    public record Requester(UUID id, String name, String email, String phone, boolean partner) {}

    public record Message(UUID id, TicketAuthorType authorType, UUID authorId, String authorName, String body, Instant createdAt) {}
}
