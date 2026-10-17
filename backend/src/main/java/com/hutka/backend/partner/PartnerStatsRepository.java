package com.hutka.backend.partner;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.ratings.Rating;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Запросы аналитики и доходов партнёра (10.1, 10.2, 10.5). «Доход» — partner_amount платежей по завершённым броням
 * (80% с базовой части и 100% доплаты за просрочку, раздел 15); считаются платежи в статусах pending и succeeded,
 * failed (списание не прошло) в доход не входит.
 * Запросы с датами и поясом — нативные (date_trunc, extract), они возвращают сырые строки: поля разбирает сервис.
 */
public interface PartnerStatsRepository extends Repository<Booking, UUID> {

    interface CarIncomeRow {
        UUID getCarId();

        BigDecimal getIncome();
    }

    interface TripIncomeRow {
        UUID getBookingId();

        UUID getCarId();

        Instant getFinishedAt();

        BigDecimal getAmount();

        BigDecimal getCommission();

        BigDecimal getPartnerAmount();
    }

    @Query("select b.carId as carId, coalesce(sum(p.partnerAmount), 0) as income "
            + "from Booking b, Payment p "
            + "where p.bookingId = b.id and b.carId in :carIds and b.status = :bookingStatus "
            + "and p.status in :paymentStatuses and b.actualEndAt >= :from and b.actualEndAt < :to "
            + "group by b.carId")
    List<CarIncomeRow> incomeByCar(@Param("carIds") Collection<UUID> carIds,
                                   @Param("bookingStatus") BookingStatus bookingStatus,
                                   @Param("paymentStatuses") Collection<PaymentStatus> paymentStatuses,
                                   @Param("from") Instant from, @Param("to") Instant to);

    @Query("select b.id as bookingId, b.carId as carId, b.actualEndAt as finishedAt, p.amount as amount, "
            + "p.commissionAmount as commission, p.partnerAmount as partnerAmount "
            + "from Booking b, Payment p, Car c "
            + "where p.bookingId = b.id and c.id = b.carId and c.partnerId = :partnerId "
            + "and b.status = :bookingStatus and p.status in :paymentStatuses "
            + "and b.actualEndAt >= :from and b.actualEndAt < :to "
            + "order by b.actualEndAt desc")
    List<TripIncomeRow> tripsIncome(@Param("partnerId") UUID partnerId,
                                    @Param("bookingStatus") BookingStatus bookingStatus,
                                    @Param("paymentStatuses") Collection<PaymentStatus> paymentStatuses,
                                    @Param("from") Instant from, @Param("to") Instant to);

    @Query("select count(b) from Booking b, Car c "
            + "where c.id = b.carId and c.partnerId = :partnerId and b.status = :status "
            + "and b.actualEndAt >= :from and b.actualEndAt < :to")
    long countFinished(@Param("partnerId") UUID partnerId, @Param("status") BookingStatus status,
                       @Param("from") Instant from, @Param("to") Instant to);

    /** Ближайшие брони по машинам партнёра (10.1): ещё не закончились по плану, ближайшие по началу первыми. */
    @Query("select b from Booking b where b.carId in :carIds and b.status in :statuses and b.plannedEndAt > :now "
            + "order by b.plannedStartAt asc")
    List<Booking> upcoming(@Param("carIds") Collection<UUID> carIds,
                           @Param("statuses") Collection<BookingStatus> statuses,
                           @Param("now") Instant now, Pageable pageable);

    /** Отзывы арендаторов (10.5): оценки партнёра и его машин. Оценки, которые партнёр ставит арендаторам, сюда не попадают. */
    @Query("select r from Rating r where r.toUserId = :partnerId or r.toCarId in :carIds order by r.createdAt desc")
    List<Rating> reviews(@Param("partnerId") UUID partnerId, @Param("carIds") Collection<UUID> carIds, Pageable pageable);

    @Query("select count(r) from Rating r where r.toUserId = :partnerId or r.toCarId in :carIds")
    long countReviews(@Param("partnerId") UUID partnerId, @Param("carIds") Collection<UUID> carIds);

    /** Строки: [0] начало периода 'YYYY-MM-DD' в поясе :tz (String), [1] доход (numeric), [2] число поездок (bigint). unit — 'week' или 'month'. */
    @Query(value = "select to_char(date_trunc(cast(:unit as text), b.actual_end_at at time zone cast(:tz as text)), 'YYYY-MM-DD') as period, "
            + "cast(coalesce(sum(p.partner_amount), 0) as numeric(12, 2)) as income, count(*) as trips "
            + "from bookings b join cars c on c.id = b.car_id join payments p on p.booking_id = b.id "
            + "where c.partner_id = :partnerId and b.status = 'finished' and p.status in ('pending', 'succeeded') "
            + "and b.actual_end_at >= :from and b.actual_end_at < :to "
            + "group by 1 order by 1", nativeQuery = true)
    List<Object[]> incomeByPeriod(@Param("unit") String unit, @Param("tz") String tz,
                                  @Param("partnerId") UUID partnerId,
                                  @Param("from") Instant from, @Param("to") Instant to);

    /** Строки: [0] ISO-день недели 1..7 (integer), [1] число завершённых поездок (bigint); по убыванию числа поездок. */
    @Query(value = "select cast(extract(isodow from (b.actual_start_at at time zone cast(:tz as text))) as integer) as weekday, "
            + "count(*) as trips "
            + "from bookings b join cars c on c.id = b.car_id "
            + "where c.partner_id = :partnerId and b.status = 'finished' "
            + "and b.actual_start_at >= :from and b.actual_start_at < :to "
            + "group by 1 order by 2 desc, 1", nativeQuery = true)
    List<Object[]> tripsByWeekday(@Param("tz") String tz, @Param("partnerId") UUID partnerId,
                                  @Param("from") Instant from, @Param("to") Instant to);

    /** Средняя фактическая длительность завершённых поездок в часах; 0, если поездок не было. */
    @Query(value = "select cast(coalesce(avg(extract(epoch from (b.actual_end_at - b.actual_start_at)) / 3600.0), 0) as numeric(10, 2)) "
            + "from bookings b join cars c on c.id = b.car_id "
            + "where c.partner_id = :partnerId and b.status = 'finished' "
            + "and b.actual_end_at >= :from and b.actual_end_at < :to", nativeQuery = true)
    BigDecimal averageTripHours(@Param("partnerId") UUID partnerId, @Param("from") Instant from, @Param("to") Instant to);

    /** Строки: [0] id машины (uuid), [1] часы поездок внутри окна [from, to) (numeric). */
    @Query(value = "select b.car_id as car_id, "
            + "cast(coalesce(sum(extract(epoch from (least(b.actual_end_at, cast(:to as timestamptz)) "
            + "- greatest(b.actual_start_at, cast(:from as timestamptz)))) / 3600.0), 0) as numeric(12, 2)) as hours "
            + "from bookings b join cars c on c.id = b.car_id "
            + "where c.partner_id = :partnerId and b.status = 'finished' "
            + "and b.actual_start_at < cast(:to as timestamptz) and b.actual_end_at > cast(:from as timestamptz) "
            + "group by b.car_id", nativeQuery = true)
    List<Object[]> bookedHoursByCar(@Param("partnerId") UUID partnerId, @Param("from") Instant from, @Param("to") Instant to);
}
