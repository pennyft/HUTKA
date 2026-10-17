package com.hutka.backend.pddtest;

import com.hutka.backend.pddtest.enums.PddAttemptStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PddTestAttemptRepository extends JpaRepository<PddTestAttempt, UUID> {

    Optional<PddTestAttempt> findByIdAndUserId(UUID id, UUID userId);

    Optional<PddTestAttempt> findFirstByUserIdOrderByStartedAtDesc(UUID userId);

    List<PddTestAttempt> findByUserIdAndCycleStartedAt(UUID userId, Instant cycleStartedAt);

    List<PddTestAttempt> findByUserIdAndStatus(UUID userId, PddAttemptStatus status);

    List<PddTestAttempt> findByUserIdOrderByStartedAtDesc(UUID userId);
}
