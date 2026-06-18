package com.hutka.backend.ai.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class AiResponse {
    private String message;
    private boolean ticketCreated;
}
