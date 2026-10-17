package com.hutka.backend.notifications.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.hutka.backend.notifications.enums.NotificationType;

import java.time.Instant;
import java.util.UUID;

/**
 * Уведомление в REST-ответе и в STOMP-сообщении (/user/queue/notifications) — один и тот же формат.
 * payload — JSON-объект с идентификаторами сущностей (bookingId, carId, ...); поле read соответствует is_read из раздела 21.4.
 */
public record NotificationResponse(UUID id, NotificationType type, JsonNode payload, boolean read, Instant createdAt) {}
