package com.hutka.backend.notifications.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.notifications.Notification;
import com.hutka.backend.notifications.NotificationRepository;
import com.hutka.backend.notifications.dto.NotificationListResponse;
import com.hutka.backend.notifications.dto.NotificationResponse;
import com.hutka.backend.notifications.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 13 и 23.10. Единая точка входа для всех пакетов: {@link #send}. Запись в БД выполняется в транзакции вызывающего
 * (откат брони откатывает и уведомление), а отправка по WebSocket — только после commit, поэтому клиент
 * никогда не получает уведомление о событии, которого в итоге не было.
 * Решения, которых нет в Hutka.md дословно, — в docs/NOTIFICATIONS_DECISIONS.md.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    /** Адрес для клиента: подписка /user/queue/notifications (префикс /user и подстановка пользователя делает Spring). */
    static final String USER_DESTINATION = "/queue/notifications";
    private static final int MAX_PAGE_SIZE = 100;

    private final NotificationRepository notifications;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    // ---------------------------------------------------------------- отправка (для других пакетов)

    /**
     * Сохраняет уведомление и после commit отправляет его пользователю в реальном времени (если он подключён).
     * Если пользователь офлайн, уведомление остаётся в истории (GET /notifications).
     * payload — только простые значения (строки, числа, boolean, вложенные Map/List): идентификаторы и факты, не готовый текст.
     */
    @Transactional
    public void send(UUID userId, NotificationType type, Map<String, Object> payload) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (JsonProcessingException e) {
            // Не роняем бизнес-операцию (создание/завершение брони) из-за того, что не получилось собрать уведомление
            log.error("Уведомление {} для {} не создано: payload не сериализуется: {}", type, userId, e.getMessage());
            return;
        }
        Notification saved = notifications.save(Notification.builder()
                .userId(userId)
                .type(type)
                .payloadJson(json)
                .build());
        NotificationResponse dto = toResponse(saved);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                push(userId, dto);
            }
        });
    }

    // ---------------------------------------------------------------- GET /notifications

    @Transactional(readOnly = true)
    public NotificationListResponse list(UUID userId, boolean unreadOnly, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        List<Notification> items = unreadOnly
                ? notifications.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pageable)
                : notifications.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return new NotificationListResponse(notifications.countByUserIdAndReadFalse(userId),
                items.stream().map(this::toResponse).toList());
    }

    // ---------------------------------------------------------------- PATCH /notifications/:id/read

    /** Идемпотентно: повторная отметка уже прочитанного уведомления не ошибка. */
    @Transactional
    public NotificationResponse markRead(UUID userId, UUID notificationId) {
        Notification notification = notifications.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Уведомление не найдено"));
        notification.setRead(true);
        return toResponse(notification);
    }

    // ---------------------------------------------------------------- внутреннее

    /** Сбой отправки (например, брокер недоступен) не должен ничего ломать: уведомление уже в истории. */
    private void push(UUID userId, NotificationResponse dto) {
        try {
            messagingTemplate.convertAndSendToUser(userId.toString(), USER_DESTINATION, dto);
        } catch (RuntimeException e) {
            log.warn("Не удалось отправить уведомление {} пользователю {} по WebSocket: {}", dto.id(), userId, e.getMessage());
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), parse(n.getPayloadJson()), n.isRead(), n.getCreatedAt());
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("В notifications.payload лежит некорректный JSON", e);
        }
    }
}
