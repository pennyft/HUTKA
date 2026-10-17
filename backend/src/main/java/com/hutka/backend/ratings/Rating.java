package com.hutka.backend.ratings;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** Раздел 21: Rating(booking_id, from_user_id, to_user_id | to_car, score 1–5, comment). */
@Entity
@Table(name = "ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "from_user_id", nullable = false)
    private UUID fromUserId;

    /** Задан ровно один из to_user_id / to_car_id (CHECK в миграции). */
    @Column(name = "to_user_id")
    private UUID toUserId;

    @Column(name = "to_car_id")
    private UUID toCarId;

    @Column(nullable = false)
    private int score;

    @Column(length = 1000)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
