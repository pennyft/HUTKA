package com.hutka.backend.support;

import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Раздел 21.4: Ticket(user_id, subject, description, category, priority, status, reopened_at).
 * Остальные поля технические: audience, created_at, updated_at, awaiting_admin_since, first_admin_reply_at, closed_at,
 * closed_by_admin_id (см. docs/SUPPORT_DECISIONS.md). userId = null только у системного тикета (audience = system).
 * Связи — по id, как в Booking.carId и Dispute.bookingId.
 */
@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private TicketAudience audience;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private TicketCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private TicketPriority priority = TicketPriority.normal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private TicketStatus status = TicketStatus.open;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Последняя активность: создание, сообщение, закрытие, переоткрытие. По нему сортируется список пользователя. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** С какого момента тикет ждёт ответа администратора (16.7: «время ожидания»). null — ответ не требуется. */
    @Column(name = "awaiting_admin_since")
    private Instant awaitingAdminSince;

    /** Первый ответ администратора — для статистики времени ответа (16.7). */
    @Column(name = "first_admin_reply_at")
    private Instant firstAdminReplyAt;

    /** Заполнено только у закрытого тикета; от него считается срок переоткрытия в 7 дней (14). */
    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closed_by_admin_id")
    private UUID closedByAdminId;

    /** Раздел 21.4: момент последнего переоткрытия. */
    @Column(name = "reopened_at")
    private Instant reopenedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    public boolean isSystem() {
        return userId == null;
    }

    // ---------------------------------------------------------------- переходы состояния

    /** Сообщение пользователя: тикет начинает ждать ответа (если уже ждёт — отсчёт с самого раннего неотвеченного). */
    public void recordUserMessage(Instant now) {
        updatedAt = now;
        if (awaitingAdminSince == null) awaitingAdminSince = now;
    }

    /** Сообщение администратора: ожидание снято, первый ответ фиксируется один раз. */
    public void recordAdminMessage(Instant now) {
        updatedAt = now;
        awaitingAdminSince = null;
        if (firstAdminReplyAt == null) firstAdminReplyAt = now;
    }

    public void close(UUID adminId, Instant now) {
        status = TicketStatus.closed;
        closedAt = now;
        closedByAdminId = adminId;
        awaitingAdminSince = null;
        updatedAt = now;
    }

    /** Возврат в open с сохранением переписки (14). Проверка срока — в TicketRules.canReopen. */
    public void reopen(Instant now) {
        status = TicketStatus.open;
        closedAt = null;
        closedByAdminId = null;
        reopenedAt = now;
        awaitingAdminSince = now;
        updatedAt = now;
    }
}
