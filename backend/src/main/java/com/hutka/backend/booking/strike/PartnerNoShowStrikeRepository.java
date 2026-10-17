package com.hutka.backend.booking.strike;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface PartnerNoShowStrikeRepository extends JpaRepository<PartnerNoShowStrike, UUID> {

    boolean existsByBookingId(UUID bookingId);

    long countByCarIdAndCreatedAtAfter(UUID carId, Instant after);
}
