package com.hutka.backend.pddtest;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "pdd_discounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PddDiscount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "attempt_id", nullable = false)
    private UUID attemptId;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;


    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "booking_id")
    private UUID bookingId;
}
