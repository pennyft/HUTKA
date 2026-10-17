package com.hutka.backend.adminapi;

import com.hutka.backend.disputes.Dispute;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

public interface AdminDisputeLookupRepository extends Repository<Dispute, UUID> {

    /** Спор по брони (по одной брони не бывает двух — uq_disputes_booking). */
    Optional<Dispute> findByBookingId(UUID bookingId);
}
