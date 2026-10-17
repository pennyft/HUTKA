package com.hutka.backend.car.catalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Данные машины, нужные для ранжирования (без привязки к JPA-сущности, чтобы логика проверялась отдельно).
 *
 * @param rating            среднее, округлённое до 1 знака; null — оценок нет
 * @param ratingSufficient  оценок не меньше минимума из настроек (раздел 7.1); иначе машина «нейтральная»
 * @param belowThreshold    рейтинг ниже порога при достаточном числе оценок
 */
public record CatalogCandidate(
        UUID id,
        BigDecimal pricePerHour,
        Instant createdAt,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal rating,
        boolean ratingSufficient,
        boolean belowThreshold) {}
