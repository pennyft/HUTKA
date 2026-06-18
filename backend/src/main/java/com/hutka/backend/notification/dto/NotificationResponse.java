package com.hutka.backend.notification.dto;

import com.hutka.backend.notification.enums.NotificationType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationResponse {

    private UUID id;
    private NotificationType type;
    private String title;
    private String message;
    private UUID referenceId;
    private boolean isRead;
    private LocalDateTime createdAt;
}
