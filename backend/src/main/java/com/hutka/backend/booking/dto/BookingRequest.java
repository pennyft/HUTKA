package com.hutka.backend.booking.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class BookingRequest {

    private UUID carId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
