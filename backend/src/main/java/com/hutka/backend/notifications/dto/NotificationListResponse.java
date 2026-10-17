package com.hutka.backend.notifications.dto;

import java.util.List;

/** GET /notifications (23.10). unreadCount — по ВСЕМ непрочитанным пользователя; notifications — одна страница. */
public record NotificationListResponse(long unreadCount, List<NotificationResponse> notifications) {}
