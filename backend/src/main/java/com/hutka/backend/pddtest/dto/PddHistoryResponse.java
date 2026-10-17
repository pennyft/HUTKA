package com.hutka.backend.pddtest.dto;

import java.util.List;


public record PddHistoryResponse(
        PddCycleInfo cycle,
        PddDiscountInfo activeDiscount,
        List<PddAttemptSummary> attempts
) {}
