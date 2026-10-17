package com.hutka.backend.car.service;

import java.util.UUID;

/**
 * Что нужно знать о бронированиях, чтобы удалить машину (10.2, 16.3). Порт, как и CarBookingsPort: пакет car не зависит
 * от пакета booking, реализация — booking/service/BookingCarDeletionPort.
 */
public interface CarDeletionPort {

    /** Была ли у машины хотя бы одна завершённая поездка (booking.status = finished) — тогда удалять нельзя, только скрыть. */
    boolean hasTripHistory(UUID carId);

    /**
     * Убирает следы отменённых броней машины (страйки неявки, привязка скидки ПДД, сами брони), которые иначе держат
     * внешние ключи. Вызывается только в транзакции удаления машины.
     */
    void removeCancelledBookings(UUID carId);
}
