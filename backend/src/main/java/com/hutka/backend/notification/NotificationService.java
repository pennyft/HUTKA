package com.hutka.backend.notification;

import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.notification.dto.NotificationResponse;
import com.hutka.backend.notification.entity.Notification;
import com.hutka.backend.notification.enums.NotificationType;
import com.hutka.backend.notification.repository.NotificationRepository;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ───── ОТПРАВКА УВЕДОМЛЕНИЯ ─────

    public void send(User user, NotificationType type, String title, String message, UUID referenceId) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .build();

        notificationRepository.save(notification);

        NotificationResponse response = toNotificationResponse(notification);
        messagingTemplate.convertAndSendToUser(
                user.getId().toString(),
                "/queue/notifications",
                response
        );
    }

    // ───── ПОЛУЧЕНИЕ УВЕДОМЛЕНИЙ ─────

    public List<NotificationResponse> getMyNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toNotificationResponse)
                .toList();
    }

    public List<NotificationResponse> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toNotificationResponse)
                .toList();
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // ───── ПРОЧИТАТЬ УВЕДОМЛЕНИЕ ─────

    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private NotificationResponse toNotificationResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setType(notification.getType());
        response.setTitle(notification.getTitle());
        response.setMessage(notification.getMessage());
        response.setReferenceId(notification.getReferenceId());
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }
}