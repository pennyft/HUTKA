package com.hutka.backend.pddtest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;


public record SubmitAnswersRequest(
        @NotNull UUID attemptId,
        @NotNull @Size(max = 10) List<@Valid PddAnswerItem> answers
) {}
