package com.hutka.backend.adminapi.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

/** PATCH: меняются только переданные поля. Если меняются variants или correctIndex — проверяется итоговая пара. */
public record UpdatePddQuestionRequest(
        @Size(max = 2000) String text,
        List<String> variants,
        Integer correctIndex,
        @Size(max = 30) String category,
        Boolean active) {}
