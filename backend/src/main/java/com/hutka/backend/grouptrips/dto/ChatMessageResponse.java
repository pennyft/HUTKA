package com.hutka.backend.grouptrips.dto;

import java.time.Instant;
import java.util.UUID;

/** Сообщение чата: и в истории (GET .../messages), и в реальном времени (/user/queue/group-trips/{id}/chat). */
public record ChatMessageResponse(UUID id, UUID tripId, UUID senderId, String senderName, String body, Instant createdAt) {}
