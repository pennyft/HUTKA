package com.hutka.backend.review.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;


@Data
public class ReviewResponse {
    private UUID id;
    private UUID bookingId;
    private UUID carId;
    private UUID reviewerId;
    private UUID revieweeId;
    private Integer carRating;
    private String carComment;
    private Integer userRating;
    private String userComment;
    private LocalDateTime createdAt;
}