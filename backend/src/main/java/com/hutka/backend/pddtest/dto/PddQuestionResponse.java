package com.hutka.backend.pddtest.dto;

import java.util.List;
import java.util.UUID;


public record PddQuestionResponse(UUID id, String text, List<String> variants) {}
