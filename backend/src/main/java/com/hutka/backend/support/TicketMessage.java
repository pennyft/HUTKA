package com.hutka.backend.support;

import com.hutka.backend.support.enums.TicketAuthorType;
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
 * Сообщение в переписке тикета (14, 23.5). В разделе 21.4 такой сущности нет, но ответы пользователя и администратора
 * (GET /tickets/:id «включая переписку») негде хранить иначе. Первое сообщение — Ticket.description, здесь только ответы.
 * Ровно один из authorUserId / authorAdminId заполнен, у AI-сообщения оба пусты (CHECK в миграции).
 */
@Entity
@Table(name = "ticket_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ticket_id", nullable = false, updatable = false)
    private UUID ticketId;

    @Enumerated(EnumType.STRING)
    @Column(name = "author_type", nullable = false, length = 8, updatable = false)
    private TicketAuthorType authorType;

    @Column(name = "author_user_id", updatable = false)
    private UUID authorUserId;

    @Column(name = "author_admin_id", updatable = false)
    private UUID authorAdminId;

    @Column(nullable = false, length = 4000, updatable = false)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
