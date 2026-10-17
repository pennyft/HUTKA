package com.hutka.backend.disputes;

import com.hutka.backend.disputes.enums.DisputeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DisputeRepository extends JpaRepository<Dispute, UUID> {

    boolean existsByBookingId(UUID bookingId);

    /**
     * Блокировка строки спора: два администратора не могут одновременно решить один спор.
     * Брать после блокировки брони и машины (порядок как в BookingService: бронь → машина).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Dispute d where d.id = :id")
    Optional<Dispute> findByIdForUpdate(@Param("id") UUID id);

    /** Скалярный запрос: не помещает спор в контекст персистентности, поэтому последующий findByIdForUpdate читает свежую строку. */
    @Query("select d.bookingId from Dispute d where d.id = :id")
    Optional<UUID> findBookingIdById(@Param("id") UUID id);

    boolean existsByBookingIdAndStatus(UUID bookingId, DisputeStatus status);

    List<Dispute> findByStatus(DisputeStatus status, Pageable pageable);

    long countByStatus(DisputeStatus status);
}
