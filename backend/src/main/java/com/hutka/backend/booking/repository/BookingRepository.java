package com.hutka.backend.booking.repository;

import com.hutka.backend.booking.entity.Booking;
import com.hutka.backend.booking.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByRenterId(UUID renterId);
    List<Booking> findByCarId(UUID carId);
    List<Booking> findByCarIdAndStatus(UUID carId, BookingStatus status);
    List<Booking> findByRenterIdAndStatus(UUID renterId, BookingStatus status);

    boolean existsByCarIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
            UUID carId,
            List<BookingStatus> statuses,
            LocalDateTime endTime,
            LocalDateTime startTime
    );
}
