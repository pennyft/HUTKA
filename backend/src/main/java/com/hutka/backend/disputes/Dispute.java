package com.hutka.backend.disputes;

import com.hutka.backend.disputes.enums.DisputeDecision;
import com.hutka.backend.disputes.enums.DisputeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Раздел 21.4: Dispute(booking_id, decision, damage_amount, status). Связь с бронью — по id, как в Booking.carId.
 * Пока спор открыт, decision и damageAmount равны null. created_at, resolved_at и resolved_by_admin_id — технические поля.
 */
@Entity
@Table(name = "disputes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dispute {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id", nullable = false, updatable = false)
    private UUID bookingId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private DisputeStatus status = DisputeStatus.open;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private DisputeDecision decision;

    /** Признанная сумма ущерба. При решении в пользу арендатора — 0.00. Реальное удержание — после платёжной интеграции (16.6). */
    @Column(name = "damage_amount", precision = 10, scale = 2)
    private BigDecimal damageAmount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by_admin_id")
    private UUID resolvedByAdminId;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = DisputeStatus.open;
    }
}
