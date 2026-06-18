package com.hutka.backend.ai.dto;

import lombok.Data;

@Data
public class AiRequest {
    private String message;
    private String currentPage;
}
