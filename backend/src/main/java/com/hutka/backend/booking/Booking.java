package com.hutka.backend.booking;

import com.hutka.backend.booking.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Раздел 21.3. Связи с User и Car — по id, как в Car.partnerId. */
@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "renter_id", nullable = false)
    private UUID renterId;

    @Column(name = "car_id", nullable = false)
    private UUID carId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.pending;

    @Column(name = "planned_start_at", nullable = false)
    private Instant plannedStartAt;

    @Column(name = "planned_end_at", nullable = false)
    private Instant plannedEndAt;

    @Column(name = "actual_start_at")
    private Instant actualStartAt;

    @Column(name = "actual_end_at")
    private Instant actualEndAt;

    // Фото грузятся пачками (@BatchSize), DTO собираются внутри транзакции сервиса — open-in-view выключен
    @ElementCollection
    @CollectionTable(name = "booking_photos_before", joinColumns = @JoinColumn(name = "booking_id"))
    @Column(name = "url", nullable = false, length = 1024)
    @BatchSize(size = 50)
    @Builder.Default
    private List<String> photosBefore = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "booking_photos_after", joinColumns = @JoinColumn(name = "booking_id"))
    @Column(name = "url", nullable = false, length = 1024)
    @BatchSize(size = 50)
    @Builder.Default
    private List<String> photosAfter = new ArrayList<>();

    /** Цена за час на момент создания брони (раздел 10.3): последующие правки цены машины её не меняют. */
    @Column(name = "price_per_hour", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerHour;

    @Column(name = "price_estimate", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceEstimate;

    @Column(name = "final_price", precision = 10, scale = 2)
    private BigDecimal finalPrice;

    @Column(name = "pdd_discount_applied", nullable = false)
    private boolean pddDiscountApplied;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "overdue_hours", precision = 10, scale = 4)
    private BigDecimal overdueHours;

    /** null — заявка Request to Book ещё ждёт ответа партнёра. */
    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "decline_reason")
    private String declineReason;

    @Column(name = "agreement_pdf_url", length = 1024)
    private String agreementPdfUrl;

    @Column(name = "agreement_sent_at")
    private Instant agreementSentAt;

    /** Раздел 6.3: когда просрочка эскалирована в «Споры» (null — не эскалировалась). Защищает от повторной эскалации. */
    @Column(name = "escalated_at")
    private Instant escalatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = BookingStatus.pending;
    }
}
