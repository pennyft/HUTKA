package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.CarStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CarMapResponse {

    private UUID id;
    private String brand;
    private String model;
    private BigDecimal pricePerHour;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private CarStatus status;
    private String mainPhotoUrl;
}