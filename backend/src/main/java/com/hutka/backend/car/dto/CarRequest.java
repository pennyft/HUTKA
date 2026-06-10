package com.hutka.backend.car.dto;

import com.hutka.backend.car.enums.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CarRequest {

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
    private BookingMode bookingMode;
    private BigDecimal latitude;
    private BigDecimal longitude;
}