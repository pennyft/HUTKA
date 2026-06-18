package com.hutka.backend.support.dto;

import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class SupportTicketResponse {

    private UUID id;
    private UUID userId;
    private String subject;
    private TicketCategory category;
    private TicketStatus status;
    private UUID assignedToId;
    private List<SupportMessageResponse> messages;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
