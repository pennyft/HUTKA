package com.hutka.backend.ai.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Точка подключения ai → car (раздел 11.1: подбор машины под текстовый запрос). Реализация — car.AiCarSearchPort. */
public interface CarSearchPort {

    /** Те же условия, что фильтры каталога (4.1); поля со значением null не применяются, неизвестные значения enum игнорируются. */
    record CarSearchQuery(String fuelType, String transmission, Integer seats, String bodyType,
                          BigDecimal minPrice, BigDecimal maxPrice, String text) {}

    record CarHit(UUID id, String make, String model, Integer year, BigDecimal pricePerHour, Integer seats,
                  String fuelType, String transmission, String bodyType, BigDecimal ratingAvg, String photoUrl) {}

    List<CarHit> search(CarSearchQuery query, int limit);
}
