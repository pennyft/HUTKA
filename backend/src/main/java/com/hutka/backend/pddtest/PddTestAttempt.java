package com.hutka.backend.pddtest;

import com.hutka.backend.pddtest.enums.PddAttemptStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "pdd_test_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PddTestAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "cycle_started_at", nullable = false)
    private Instant cycleStartedAt;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PddAttemptStatus status;


    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "question_ids", nullable = false, columnDefinition = "jsonb")
    private String questionIdsJson;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;


    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "errors_count")
    private Integer errorsCount;

    private Boolean passed;

    public List<UUID> questionIds() {
        return PddJson.readUuids(questionIdsJson);
    }
}
