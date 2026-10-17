package com.hutka.backend.grouptrips.dto;

/** Тело STOMP SEND на /app/group-trips/{id}/chat: {"body": "..."} (проверка — GroupTripRules.normalize, до 1000 символов). */
public record ChatMessageRequest(String body) {}
