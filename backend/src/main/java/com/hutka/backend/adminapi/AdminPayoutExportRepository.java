package com.hutka.backend.adminapi;

import com.hutka.backend.payments.Payout;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface AdminPayoutExportRepository extends Repository<Payout, UUID> {

    @Query("select p from Payout p where p.createdAt >= :from and p.createdAt < :to order by p.createdAt desc, p.id")
    Page<Payout> findInRange(@Param("from") Instant from, @Param("to") Instant to, Pageable pageable);
}
