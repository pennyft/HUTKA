package com.hutka.backend.pdd.dto;

import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class PddSubmitRequest {

    // questionId → answerId
    private Map<UUID, UUID> answers;
}
