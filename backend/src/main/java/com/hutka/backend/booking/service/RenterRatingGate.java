package com.hutka.backend.booking.service;

import java.util.UUID;

/**
 * Точка подключения пакета ratings (раздел 7.1). Реализация — ratings.service.RatingPolicy.
 * Порт лежит в booking, чтобы не было циклической зависимости пакетов (ratings использует Booking).
 */
public interface RenterRatingGate {

    /** true — арендатору бронирование недоступно: рейтинг ниже порога при достаточном числе оценок. */
    boolean isBookingBlocked(UUID renterId);
}
