package com.hutka.backend.grouptrips;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GroupTripMessageRepository extends JpaRepository<GroupTripMessage, UUID> {

    Page<GroupTripMessage> findByTripId(UUID tripId, Pageable pageable);
}
