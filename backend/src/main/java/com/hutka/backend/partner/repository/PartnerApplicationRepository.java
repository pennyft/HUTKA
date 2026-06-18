package com.hutka.backend.partner.repository;

import com.hutka.backend.partner.entity.PartnerApplication;
import com.hutka.backend.partner.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PartnerApplicationRepository extends JpaRepository<PartnerApplication, UUID> {

    Optional<PartnerApplication> findByUserId(UUID userId);

    boolean existsByUserIdAndStatusIn(UUID userId, List<ApplicationStatus> statuses);

    long countByUserIdAndStatus(UUID userId, ApplicationStatus status);

    List<PartnerApplication> findByStatus(ApplicationStatus status);
}