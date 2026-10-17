package com.hutka.backend.support.dto;

import com.hutka.backend.support.TicketMessage;
import com.hutka.backend.support.enums.TicketAuthorType;

import java.time.Instant;
import java.util.UUID;

/** Сообщение глазами пользователя. Личность администратора не раскрывается: authorType = admin — это «Поддержка». */
public record TicketMessageResponse(UUID id, TicketAuthorType authorType, String body, Instant createdAt) {

    public static TicketMessageResponse from(TicketMessage message) {
        return new TicketMessageResponse(message.getId(), message.getAuthorType(), message.getBody(), message.getCreatedAt());
    }
}
