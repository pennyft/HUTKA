package com.hutka.backend.car;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "fuel_type", nullable = false)
    private String fuelType;

    @Column(nullable = false)
    private String transmission;

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

    private String description;

    @ElementCollection
    @CollectionTable(name = "car_photos", joinColumns = @JoinColumn(name = "car_id"))
    @Column(name = "url", nullable = false)
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    @Column(name = "tech_passport_number", nullable = false)
    private String techPassportNumber;

    @Column(name = "insurance_policy_number", nullable = false)
    private String insurancePolicyNumber;

    @Column(name = "inspection_expiry_date", nullable = false)
    private LocalDate inspectionExpiryDate;

    @Column(name = "availability_schedule", columnDefinition = "jsonb")
    private String availabilitySchedule;

    @Column(name = "booking_mode", nullable = false)
    private String bookingMode;

    /** Раздел 23.12: pending | approved | rejected — независимо от операционного status. */
    @Column(name = "moderation_status", nullable = false)
    @Builder.Default
    private String moderationStatus = "pending";

    @Column(name = "rejection_reason")
    private String rejectionReason;


    @Column
    private String status;

    @Column(name = "is_hidden", nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "no_show_strikes", nullable = false)
    @Builder.Default
    private Integer noShowStrikes = 0;

    @Column(name = "service_history", columnDefinition = "jsonb")
    private String serviceHistory;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    private BigDecimal ratingAvg;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (moderationStatus == null) moderationStatus = "pending";
    }
}
