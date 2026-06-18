package com.hutka.backend.partner.dto;

import com.hutka.backend.partner.enums.ApplicationStatus;
import com.hutka.backend.partner.enums.PartnerType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PartnerApplicationResponse {

    private UUID id;
    private UUID userId;
    private PartnerType partnerType;
    private String passportNumber;
    private String companyName;
    private String taxNumber;
    private boolean termsAccepted;
    private ApplicationStatus status;
    private String rejectionReason;
    private UUID reviewedById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
