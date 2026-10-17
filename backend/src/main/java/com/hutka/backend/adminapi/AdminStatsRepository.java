package com.hutka.backend.adminapi;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.enums.ModerationStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Агрегаты для дашборда (16.1). Нативные запросы возвращают строки [0] день 'YYYY-MM-DD' (String), [1] значение. */
public interface AdminStatsRepository extends Repository<User, UUID> {

    interface StatusCount {
        BookingStatus getStatus();

        long getCnt();
    }

    @Query("select count(u) from User u")
    long countUsers();

    @Query("select count(u) from User u where u.verificationStatus = :status")
    long countUsersByVerification(@Param("status") VerificationStatus status);

    @Query("select count(u) from User u where u.partner = true")
    long countPartners();

    @Query("select count(u) from User u where u.blocked = true")
    long countBlockedUsers();

    @Query("select count(u) from User u where u.createdAt >= :since")
    long countUsersSince(@Param("since") Instant since);

    @Query("select count(distinct b.renterId) from Booking b where b.createdAt >= :since")
    long countActiveRenters(@Param("since") Instant since);

    @Query("select count(c) from Car c where c.moderationStatus = :status")
    long countCars(@Param("status") ModerationStatus status);

    @Query("select count(c) from Car c where c.moderationStatus = :status and c.hidden = true")
    long countHiddenCars(@Param("status") ModerationStatus status);

    @Query("select b.status as status, count(b) as cnt from Booking b group by b.status")
    List<StatusCount> bookingCountsByStatus();

    @Query("select count(b) from Booking b where b.createdAt >= :since")
    long countBookingsSince(@Param("since") Instant since);

    @Query(value = "select to_char(date_trunc('day', created_at at time zone cast(:tz as text)), 'YYYY-MM-DD') as day, count(*) as cnt "
            + "from users where created_at >= :since group by 1 order by 1", nativeQuery = true)
    List<Object[]> registrationsPerDay(@Param("tz") String tz, @Param("since") Instant since);

    @Query(value = "select to_char(date_trunc('day', created_at at time zone cast(:tz as text)), 'YYYY-MM-DD') as day, count(*) as cnt "
            + "from bookings where created_at >= :since group by 1 order by 1", nativeQuery = true)
    List<Object[]> bookingsPerDay(@Param("tz") String tz, @Param("since") Instant since);

    @Query(value = "select to_char(date_trunc('day', created_at at time zone cast(:tz as text)), 'YYYY-MM-DD') as day, "
            + "cast(coalesce(sum(commission_amount), 0) as numeric(12, 2)) as amount "
            + "from payments where status = 'succeeded' and created_at >= :since group by 1 order by 1", nativeQuery = true)
    List<Object[]> commissionPerDay(@Param("tz") String tz, @Param("since") Instant since);
}
