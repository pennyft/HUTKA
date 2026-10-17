package com.hutka.backend.pddtest.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;


public record PddAnswerItem(@NotNull UUID questionId, @NotNull @Min(0) Integer answerIndex) {}
