package com.hutka.backend.car;

import com.hutka.backend.car.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "cars")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Car {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "partner_id", nullable = false)
    private UUID partnerId;

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "plate_number", nullable = false)
    private String plateNumber;

    @Column(name = "mileage_km", nullable = false)
    private Integer mileageKm;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Transmission transmission;

    @Column(nullable = false)
    private Integer seats;

    @Column(name = "body_type", nullable = false)
    private String bodyType;

    @Column(nullable = false)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "price_per_hour", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerHour;

    @Column(length = 2000)
    private String description;

    // @BatchSize: фото подгружаются пачками по 50 машин, а не отдельным запросом на каждую (N+1 в каталоге)
    @ElementCollection
    @CollectionTable(name = "car_photos", joinColumns = @JoinColumn(name = "car_id"))
    @Column(name = "url", nullable = false, length = 1024)
    @BatchSize(size = 50)
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    @Column(name = "tech_passport_number", nullable = false)
    private String techPassportNumber;

    @Column(name = "insurance_policy_number", nullable = false)
    private String insurancePolicyNumber;

    @Column(name = "inspection_expiry_date", nullable = false)
    private LocalDate inspectionExpiryDate;

    // Hibernate 6 без @JdbcTypeCode отправляет String как varchar, и PostgreSQL отвергает запись в jsonb
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "availability_schedule", columnDefinition = "jsonb")
    private String availabilitySchedule;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_mode", nullable = false)
    private BookingMode bookingMode;

    /** Модерация заявки; независима от операционного status (раздел 9.3). */
    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.pending;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    /** Раздел 22.2. По умолчанию available; в каталог машина попадает только после moderation_status = approved. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CarStatus status = CarStatus.available;

    @Column(name = "is_hidden", nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "no_show_strikes", nullable = false)
    @Builder.Default
    private Integer noShowStrikes = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "service_history", columnDefinition = "jsonb")
    private String serviceHistory;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    private BigDecimal ratingAvg;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (moderationStatus == null) moderationStatus = ModerationStatus.pending;
        if (status == null) status = CarStatus.available;
    }
}
