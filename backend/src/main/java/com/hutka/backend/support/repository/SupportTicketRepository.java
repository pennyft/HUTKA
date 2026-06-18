package com.hutka.backend.support.repository;

import com.hutka.backend.support.entity.SupportTicket;
import com.hutka.backend.support.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    List<SupportTicket> findByUserId(UUID userId);
    List<SupportTicket> findByStatus(TicketStatus status);
    List<SupportTicket> findByAssignedToId(UUID assignedToId);
}
