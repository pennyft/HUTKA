package com.hutka.backend.booking.service;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.car.Car;

import java.util.UUID;

/**
 * Точка подключения пакета disputes (раздел 16.6), которого ещё нет. Вызывается при эскалации просрочки (6.3).
 * Настоящая реализация создаёт спор для администратора; закрытие брони и возврат машины из under_review
 * (22.2: under_review → available) — по решению администратора, это забота пакета disputes.
 */
public interface DisputePort {

    void openOverdueDispute(Booking booking, Car car);
    boolean hasOpenDispute(UUID bookingId);
}
