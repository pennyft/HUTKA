package com.hutka.backend.pddtest;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PddDiscountRepository extends JpaRepository<PddDiscount, UUID> {


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select d from PddDiscount d
            where d.userId = :userId and d.usedAt is null
              and d.grantedAt <= :at and d.expiresAt > :at
            order by d.grantedAt
            """)
    List<PddDiscount> findValidForUpdate(@Param("userId") UUID userId, @Param("at") Instant at, Pageable pageable);


    Optional<PddDiscount> findFirstByUserIdAndUsedAtIsNullAndExpiresAtAfterOrderByGrantedAtAsc(UUID userId, Instant now);
}
