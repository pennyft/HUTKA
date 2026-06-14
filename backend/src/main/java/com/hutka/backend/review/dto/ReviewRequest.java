package com.hutka.backend.review.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ReviewRequest {

    private UUID bookingId;
    private Integer carRating;
    private String carComment;
    private Integer userRating;
    private String userComment;

    public UUID getBookingId() { return bookingId; }
    public Integer getCarRating() { return carRating; }
    public String getCarComment() { return carComment; }
    public Integer getUserRating() { return userRating; }
    public String getUserComment() { return userComment; }
}
