package com.hutka.backend.support.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class SupportMessageResponse {

    private UUID id;
    private UUID senderId;
    private String senderName;
    private String text;
    private LocalDateTime createdAt;
}
