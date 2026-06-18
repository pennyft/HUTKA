package com.hutka.backend.dispute.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class DisputeRequest {

    private UUID bookingId;
    private String description;
}
