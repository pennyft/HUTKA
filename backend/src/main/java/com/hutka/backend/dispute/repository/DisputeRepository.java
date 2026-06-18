package com.hutka.backend.dispute.repository;

import com.hutka.backend.dispute.entity.Dispute;
import com.hutka.backend.dispute.enums.DisputeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, UUID> {

    Optional<Dispute> findByBookingId(UUID bookingId);
    boolean existsByBookingId(UUID bookingId);
    List<Dispute> findByStatus(DisputeStatus status);
    List<Dispute> findByInitiatorId(UUID initiatorId);
}
