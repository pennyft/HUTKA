package com.hutka.backend.adminapi.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PddQuestionAdminResponse(
        UUID id,
        String text,
        List<String> variants,
        int correctIndex,
        String category,
        boolean active,
        String source,
        Instant createdAt) {}
