package com.hutka.backend.verification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {

    // Последний активный (не использованный) код для пользователя
    Optional<EmailVerification> findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(UUID userId);
}
