package com.hutka.backend.booking;

import com.hutka.backend.booking.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Порядок блокировок во всех операциях: сначала строка брони, потом строка машины
 * (BookingAutomationService и Quartz-джобы соблюдают тот же порядок, иначе возможен deadlock).
 */
public interface BookingRepository extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") UUID id);

    /** Раздел 6.1: пересечение полуинтервалов [start, end) с бронями машины в заданных статусах. */
    @Query("""
            select count(b) > 0 from Booking b
            where b.carId = :carId
              and b.status in :statuses
              and b.plannedStartAt < :end
              and b.plannedEndAt > :start
            """)
    boolean existsOverlapping(@Param("carId") UUID carId,
                              @Param("statuses") Collection<BookingStatus> statuses,
                              @Param("start") Instant start,
                              @Param("end") Instant end);

    boolean existsByCarIdAndStatusAndIdNot(UUID carId, BookingStatus status, UUID id);

    /** Раздел 10.3: есть ли у машины брони в заданных статусах (для запрета смены адреса, см. BookingCarBookingsPort). */
    boolean existsByCarIdAndStatusIn(UUID carId, Collection<BookingStatus> statuses);

    /**
     * Баг B3: есть ли другая бронь этой машины, которая закончилась (по плану) не позже {@code before}, но машину
     * не вернула: она всё ещё в статусе {@code activeStatus} либо её просрочка уже эскалирована в споры
     * (escalated_at не null; тогда машина остаётся under_review даже после finish).
     * Если такая бронь есть, недоступность машины к началу следующей брони вызвана просрочкой арендатора,
     * а не неявкой партнёра.
     */
    @Query("""
            select count(b) > 0 from Booking b
            where b.carId = :carId
              and b.id <> :excludeId
              and b.plannedEndAt <= :before
              and (b.status = :activeStatus or b.escalatedAt is not null)
            """)
    boolean existsOverdueBookingBlockingCar(@Param("carId") UUID carId,
                                            @Param("excludeId") UUID excludeId,
                                            @Param("before") Instant before,
                                            @Param("activeStatus") BookingStatus activeStatus);

    // ---- выборки для BookingSweeper (только id; сам переход делает BookingAutomationService под блокировкой) ----

    @Query("select b.id from Booking b where b.status = :status and b.confirmedAt is null and b.createdAt < :before")
    List<UUID> findUnansweredRequestIds(@Param("status") BookingStatus status, @Param("before") Instant before);

    @Query("select b.id from Booking b where b.status = :status and b.plannedStartAt < :before")
    List<UUID> findPendingStartingBefore(@Param("status") BookingStatus status, @Param("before") Instant before);

    @Query("select b.id from Booking b where b.status = :status and b.escalatedAt is null and b.plannedEndAt < :before")
    List<UUID> findActiveEndingBefore(@Param("status") BookingStatus status, @Param("before") Instant before);

    @Query("""
            select b.id from Booking b
            where b.status = :status
              and b.agreementSentAt is null
              and b.actualEndAt > :after
              and b.actualEndAt < :before
            """)
    List<UUID> findFinishedWithoutAgreement(@Param("status") BookingStatus status,
                                            @Param("after") Instant after,
                                            @Param("before") Instant before);
}
