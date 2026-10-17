package com.hutka.backend.pddtest.dto;

import java.util.UUID;


public record PddAttemptResultResponse(
        UUID attemptId,
        int attemptNumber,
        int errorsCount,
        boolean passed,
        PddCycleInfo cycle,
        PddDiscountInfo discount
) {}
