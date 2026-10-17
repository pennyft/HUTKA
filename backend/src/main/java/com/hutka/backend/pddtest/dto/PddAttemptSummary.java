package com.hutka.backend.pddtest.dto;

import com.hutka.backend.pddtest.enums.PddAttemptStatus;

import java.time.Instant;
import java.util.UUID;

public record PddAttemptSummary(
        UUID id,
        int attemptNumber,
        Instant cycleStartedAt,
        Instant startedAt,
        Instant submittedAt,
        PddAttemptStatus status,
        Integer errorsCount,
        Boolean passed
) {}
