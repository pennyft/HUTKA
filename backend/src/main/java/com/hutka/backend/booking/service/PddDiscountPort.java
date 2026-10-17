package com.hutka.backend.booking.service;

import java.time.Instant;
import java.util.UUID;

/**
 * Точка подключения пакета pddtest (раздел 5.3). Реализация — pddtest.service.PddDiscountService.
 * Атомарно проверяет, есть ли у пользователя скидка, действовавшая в момент СОЗДАНИЯ брони, и «сжигает» её.
 * Возвращает true, если скидка применена к этой брони.
 */
public interface PddDiscountPort {
    boolean consumeDiscount(UUID userId, UUID bookingId, Instant bookingCreatedAt);
}
