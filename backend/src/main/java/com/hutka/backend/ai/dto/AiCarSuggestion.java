package com.hutka.backend.ai.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Машина из подбора (11.1). Данные берутся из каталога, а не из ответа модели — модель не может выдумать машину или цену. */
public record AiCarSuggestion(UUID id, String make, String model, Integer year, BigDecimal pricePerHour,
                              Integer seats, String fuelType, String transmission, String bodyType,
                              BigDecimal ratingAvg, String photoUrl) {}
