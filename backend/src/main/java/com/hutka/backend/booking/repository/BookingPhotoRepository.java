package com.hutka.backend.booking.repository;

import com.hutka.backend.booking.entity.BookingPhoto;
import com.hutka.backend.booking.enums.PhotoType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingPhotoRepository extends JpaRepository<BookingPhoto, UUID> {

    List<BookingPhoto> findByBookingId(UUID bookingId);
    List<BookingPhoto> findByBookingIdAndPhotoType(UUID bookingId, PhotoType photoType);
}
