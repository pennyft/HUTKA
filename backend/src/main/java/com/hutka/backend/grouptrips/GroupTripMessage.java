package com.hutka.backend.grouptrips;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** Сообщение чата поездки (раздел 8): история хранится на сервере и отдаётся целиком, с пагинацией. */
@Entity
@Table(name = "group_trip_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupTripMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "trip_id", nullable = false, updatable = false)
    private UUID tripId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    @Column(nullable = false, length = 1000, updatable = false)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
