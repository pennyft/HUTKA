package com.hutka.backend.auth;

import com.hutka.backend.auth.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(nullable = false)
    private String phone;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus;

    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "license_issue_date")
    private LocalDate licenseIssueDate;

    
    @Column(name = "license_rejection_reason", length = 500)
    private String licenseRejectionReason;

    @Column(name = "is_partner", nullable = false)
    private boolean partner;

    /** 16.2: блокировка бессрочная, причина обязательна (V15). */
    @Column(name = "blocked", nullable = false)
    private boolean blocked;

    @Column(name = "blocked_reason", length = 500)
    private String blockedReason;

    @Column(name = "blocked_at")
    private Instant blockedAt;

    @Column(name = "blocked_by_admin_id")
    private UUID blockedByAdminId;

    /** 10.6, 21.1: реквизиты выплат партнёру (колонка есть с V1). JSON {"cardNumber","holderName"}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payout_bank_details", columnDefinition = "jsonb")
    private String payoutBankDetails;
    @Column(name = "rating_avg")
    private BigDecimal ratingAvg;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (verificationStatus == null) verificationStatus = VerificationStatus.unverified;
    }
}