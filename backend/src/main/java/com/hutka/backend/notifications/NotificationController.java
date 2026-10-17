package com.hutka.backend.notifications;

import com.hutka.backend.notifications.dto.NotificationListResponse;
import com.hutka.backend.notifications.dto.NotificationResponse;
import com.hutka.backend.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Раздел 23.10. Принципал — UUID пользователя из JwtAuthFilter. Доставка в реальном времени — STOMP (config.WebSocketConfig). */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** История уведомлений, включая полученные офлайн (13): новые сверху, по страницам, опционально только непрочитанные. */
    @GetMapping
    public NotificationListResponse list(@AuthenticationPrincipal UUID userId,
                                         @RequestParam(defaultValue = "false") boolean unreadOnly,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return notificationService.list(userId, unreadOnly, page, size);
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return notificationService.markRead(userId, id);
    }
}
