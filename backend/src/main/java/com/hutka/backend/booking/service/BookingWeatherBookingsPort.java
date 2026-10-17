package com.hutka.backend.booking.service;

import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.weather.service.WeatherBookingsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Реализация порта погодного модуля (12): отдаёт бронь вместе с машиной одним объектом. Живёт в booking —
 * как AiPartnerInsightsPort и BookingCarBookingsPort: пакет weather о booking и car не знает.
 */
@Component
@RequiredArgsConstructor
public class BookingWeatherBookingsPort implements WeatherBookingsPort {

    private final BookingRepository bookings;
    private final CarRepository cars;

    @Override
    @Transactional(readOnly = true)
    public Optional<Target> find(UUID bookingId) {
        return bookings.findById(bookingId).flatMap(booking -> cars.findById(booking.getCarId()).map(car -> new Target(
                booking.getId(), booking.getRenterId(), car.getId(), car.getMake() + " " + car.getModel(),
                car.getLatitude(), car.getLongitude(), booking.getPlannedStartAt(), booking.getPlannedEndAt(),
                booking.getStatus() == BookingStatus.pending)));
    }
}
