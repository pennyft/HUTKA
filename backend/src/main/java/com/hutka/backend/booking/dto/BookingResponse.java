package com.hutka.backend.booking.dto;

import com.hutka.backend.booking.enums.BookingStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class BookingResponse {

    private UUID id;
    private UUID carId;
    private String carBrand;
    private String carModel;
    private UUID renterId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private BigDecimal totalPrice;
    private BookingStatus status;
    private String cancelReason;
    private List<String> beforePhotoUrls;
    private List<String> afterPhotoUrls;
    private LocalDateTime createdAt;
}
