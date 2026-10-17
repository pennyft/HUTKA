package com.hutka.backend.booking;

import com.hutka.backend.booking.enums.BookingStatus;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Выборка для рекомендаций партнёру (11.2). Отдельный интерфейс — чтобы не менять BookingRepository, как RatingCarStatsRepository у ratings. */
public interface AiPartnerStatsRepository extends Repository<Booking, UUID> {

    @Query("""
            select b.carId as carId, b.actualStartAt as startedAt, b.finalPrice as finalPrice
            from Booking b
            where b.carId in :carIds
              and b.status = :status
              and b.actualEndAt >= :since
            """)
    List<FinishedTrip> findFinishedTrips(@Param("carIds") Collection<UUID> carIds,
                                         @Param("status") BookingStatus status,
                                         @Param("since") Instant since);

    interface FinishedTrip {
        UUID getCarId();

        Instant getStartedAt();

        BigDecimal getFinalPrice();
    }
}
