package com.hutka.backend.car.service;

import java.util.UUID;

/**
 * Точка подключения пакета booking (раздел 10.3). Реализация — booking.service.BookingCarBookingsPort.
 * Порт лежит в car, чтобы CarService не зависел от классов booking (booking уже зависит от car).
 */
public interface CarBookingsPort {

    /** true — у машины есть бронь в статусе pending (машина reserved) или active (машина in_trip). */
    boolean hasActiveBookings(UUID carId);
}
