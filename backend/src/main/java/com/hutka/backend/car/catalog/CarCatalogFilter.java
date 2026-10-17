package com.hutka.backend.car.catalog;

import com.hutka.backend.car.enums.FuelType;
import com.hutka.backend.car.enums.Transmission;

import java.math.BigDecimal;

/**
 * Раздел 4.1: фильтры каталога и текстовый поиск. Все поля необязательные; заданные — объединяются по «И».
 * q — строка поиска по марке и модели (отдельно от фильтров).
 */
public record CarCatalogFilter(
        FuelType fuelType,
        Transmission transmission,
        Integer seats,
        String bodyType,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String q) {}
