package com.hutka.backend.adminapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Количество вариантов (2–10) и корректность correctIndex проверяет сервис. active по умолчанию true. */
public record CreatePddQuestionRequest(
        @NotBlank @Size(max = 2000) String text,
        @NotNull List<String> variants,
        @NotNull Integer correctIndex,
        @Size(max = 30) String category,
        Boolean active) {}
