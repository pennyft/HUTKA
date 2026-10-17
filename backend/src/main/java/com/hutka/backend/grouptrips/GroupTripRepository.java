package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface GroupTripRepository extends JpaRepository<GroupTrip, UUID>, JpaSpecificationExecutor<GroupTrip> {

    /** Блокировка строки: присоединение, закрытие и отмена одной поездки выполняются по очереди (места не «пересчитываются» гонкой). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from GroupTrip t where t.id = :id")
    Optional<GroupTrip> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Sweeper: open/closed поездки, чей день уже прошёл, → finished. Один UPDATE по условию — идемпотентен и безопасен
     * при нескольких экземплярах приложения.
     */
    @Modifying
    @Query("""
            update GroupTrip t set t.status = :finished, t.updatedAt = :now
            where t.status in :active and t.tripDate < :today
            """)
    int finishPastTrips(@Param("finished") GroupTripStatus finished,
                        @Param("active") Collection<GroupTripStatus> active,
                        @Param("today") LocalDate today,
                        @Param("now") Instant now);
}
