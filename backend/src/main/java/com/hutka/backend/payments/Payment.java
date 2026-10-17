package com.hutka.backend.payments;

import com.hutka.backend.payments.enums.PaymentKind;
import com.hutka.backend.payments.enums.PaymentStatus;
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
import java.util.UUID;

/**
 * Платёжная операция по брони (15). Разделение суммы между платформой и партнёром фиксируется в момент создания записи
 * вместе с процентом комиссии (commission_percent): позднее изменение настройки в админке прошлые платежи не пересчитывает.
 * payout_id пуст, пока деньги партнёра не включены в выплату; по нему считается баланс «до следующей выплаты» (10.6).
 * Пара (booking_id, kind) уникальна — по одной брони не может быть двух списаний.
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id", nullable = false, updatable = false)
    private UUID bookingId;

    @Column(name = "partner_id", nullable = false, updatable = false)
    private UUID partnerId;

    @Column(name = "renter_id", nullable = false, updatable = false)
    private UUID renterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24, updatable = false)
    private PaymentKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentStatus status;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "commission_percent", nullable = false, precision = 5, scale = 2, updatable = false)
    private BigDecimal commissionPercent;

    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal commissionAmount;

    @Column(name = "partner_amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal partnerAmount;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_ref", length = 100)
    private String providerRef;

    @Column(name = "failure_reason", length = 300)
    private String failureReason;

    /** Сколько попыток списания уже сделано. */
    @Column(nullable = false)
    private int attempts;

    @Column(name = "payout_id")
    private UUID payoutId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = PaymentStatus.pending;
    }
}
