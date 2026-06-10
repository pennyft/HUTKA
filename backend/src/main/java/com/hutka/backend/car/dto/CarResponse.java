package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CarResponse {

    private UUID id;
    private UUID ownerId;
    private String brand;
    private String model;
    private Integer year;
    private Integer mileage;
    private FuelType fuelType;
    private Transmission transmission;
    private Integer seats;
    private BodyType bodyType;
    private BigDecimal pricePerHour;
    private String description;
    private CarStatus status;
    private BookingMode bookingMode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal rating;
    private List<String> photoUrls;
}