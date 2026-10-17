package com.hutka.backend.payments;

import com.hutka.backend.payments.enums.PayoutStatus;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Выплата партнёру (21.4: partner_id, period_start, period_end, amount, commission_deducted, status, paid_at).
 * amount — сумма, перечисляемая партнёру (уже за вычетом комиссии); commission_deducted — удержанная с этих поездок
 * комиссия (10.6: «какая комиссия списана»). Состав выплаты — платежи с payments.payout_id = id.
 */
@Entity
@Table(name = "payouts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "partner_id", nullable = false, updatable = false)
    private UUID partnerId;

    @Column(name = "period_start", nullable = false, updatable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false, updatable = false)
    private LocalDate periodEnd;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "commission_deducted", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal commissionDeducted;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PayoutStatus status;

    /** Сколько попыток перечисления уже сделано. */
    @Column(nullable = false)
    private int attempts;

    @Column(name = "provider_ref", length = 100)
    private String providerRef;

    @Column(name = "failure_reason", length = 300)
    private String failureReason;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = PayoutStatus.pending;
    }
}
