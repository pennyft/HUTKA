package com.hutka.backend.notifications;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadFalse(UUID userId);

    /** Чужое уведомление «не существует» (404, а не 403) — как брони и машины в остальных пакетах. */
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
}
