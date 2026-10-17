package com.hutka.backend.booking.service;

import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.service.CarBookingsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * Раздел 10.3: «статусы pending, reserved или in_trip». reserved и in_trip — статусы машины (CarStatus), у броней
 * (BookingStatus) это pending и active, поэтому проверяются они.
 */
@Component
@RequiredArgsConstructor
public class BookingCarBookingsPort implements CarBookingsPort {

    private static final Set<BookingStatus> ACTIVE_STATUSES = EnumSet.of(BookingStatus.pending, BookingStatus.active);

    private final BookingRepository bookingRepository;

    @Override
    public boolean hasActiveBookings(UUID carId) {
        return bookingRepository.existsByCarIdAndStatusIn(carId, ACTIVE_STATUSES);
    }
}
