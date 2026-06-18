package com.hutka.backend.dispute.dto;

import com.hutka.backend.dispute.enums.DisputeInitiator;
import com.hutka.backend.dispute.enums.DisputeStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class DisputeResponse {

    private UUID id;
    private UUID bookingId;
    private UUID initiatorId;
    private DisputeInitiator initiatorRole;
    private String description;
    private DisputeStatus status;
    private String resolution;
    private UUID resolverId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
