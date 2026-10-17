package com.hutka.backend.pddtest.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


public record PddTestStartResponse(
        UUID attemptId,
        int attemptNumber,
        int maxAttempts,
        Instant startedAt,
        Instant expiresAt,
        List<PddQuestionResponse> questions
) {}
