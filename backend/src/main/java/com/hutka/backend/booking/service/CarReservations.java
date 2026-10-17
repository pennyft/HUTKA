package com.hutka.backend.booking.service;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.enums.CarStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Общая для отмены, отклонения и автоотмены логика статуса машины (22.2). Вызывать с заблокированной машиной. */
@Component
@RequiredArgsConstructor
public class CarReservations {

    private final BookingRepository bookingRepository;

    /** reserved → available, но только если нет других ожидающих броней на эту машину. */
    public void releaseIfNoOtherPending(Car car, Booking cancelled) {
        if (car.getStatus() != CarStatus.reserved) {
            return;
        }
        boolean hasOtherPending = bookingRepository
                .existsByCarIdAndStatusAndIdNot(car.getId(), BookingStatus.pending, cancelled.getId());
        if (!hasOtherPending) {
            car.setStatus(CarStatus.available);
        }
    }
}
