package com.hutka.backend.weather.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Что погодному модулю нужно знать о брони. Модуль weather не зависит от пакетов booking/car: порт описан здесь,
 * реализация — booking/service/BookingWeatherBookingsPort (тот же приём, что CarBookingsPort и PartnerInsightsPort).
 */
public interface WeatherBookingsPort {

    /**
     * carTitle — «марка модель» для текста уведомления; latitude/longitude — координаты машины (могут быть null);
     * awaitingStart — бронь ещё в статусе pending, то есть поездка не начата и не отменена (6.1).
     */
    record Target(UUID bookingId, UUID renterId, UUID carId, String carTitle, BigDecimal latitude, BigDecimal longitude,
                  Instant plannedStartAt, Instant plannedEndAt, boolean awaitingStart) {}

    Optional<Target> find(UUID bookingId);
}
