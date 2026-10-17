package com.hutka.backend.booking;

import com.hutka.backend.booking.enums.BookingStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Запрос для платёжного модуля (15). Отдельный репозиторий — как AiPartnerStatsRepository: BookingRepository не меняется.
 */
public interface BookingPaymentQueryRepository extends Repository<Booking, UUID> {

    @Query("select b.id from Booking b where b.status = :status and b.finalPrice > 0 "
            + "and b.actualEndAt >= :from and b.actualEndAt < :to order by b.actualEndAt")
    List<UUID> findFinishedIds(@Param("status") BookingStatus status, @Param("from") Instant from, @Param("to") Instant to);
}
