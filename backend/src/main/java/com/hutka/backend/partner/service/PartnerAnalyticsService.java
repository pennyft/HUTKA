package com.hutka.backend.partner.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.partner.PartnerStatsRepository;
import com.hutka.backend.partner.dto.PartnerAnalyticsResponse;
import com.hutka.backend.partner.dto.PartnerAnalyticsResponse.CarUtilization;
import com.hutka.backend.partner.dto.PartnerAnalyticsResponse.NextBooking;
import com.hutka.backend.partner.dto.PartnerAnalyticsResponse.RevenuePoint;
import com.hutka.backend.partner.dto.PartnerAnalyticsResponse.Summary;
import com.hutka.backend.partner.dto.PartnerAnalyticsResponse.WeekdayStat;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 10.1 (метрики) и 10.5 (аналитика партнёра): доход по неделям и месяцам, топ дней недели, загруженность каждой
 * машины, средняя длительность аренды. Отзывы вынесены в GET /partner/reviews (PartnerReviewService), детализация
 * «дохода за месяц» — в GET /partner/income (PartnerIncomeService).
 */
@Service
@RequiredArgsConstructor
public class PartnerAnalyticsService {

    static final int DEFAULT_WEEKS = 12;
    static final int MAX_WEEKS = 52;
    static final int DEFAULT_MONTHS = 6;
    static final int MAX_MONTHS = 24;
    static final int DEFAULT_DAYS = 30;
    static final int MAX_DAYS = 90;

    private final PartnerStatsRepository stats;
    private final PartnerAccess access;
    private final CarRepository cars;

    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;

    @Value("${app.payments.currency:BYN}")
    private String currency;

    /** weeks / months — длина рядов дохода; days — окно для дней недели, длительности и загруженности. null — значение по умолчанию. */
    @Transactional(readOnly = true)
    public PartnerAnalyticsResponse analytics(UUID partnerId, Integer weeks, Integer months, Integer days) {
        User partner = access.requirePartner(partnerId);
        ZoneId zone = ZoneId.of(timezone);
        LocalDate today = LocalDate.now(zone);
        Instant now = Instant.now();
        Instant endExclusive = today.plusDays(1).atStartOfDay(zone).toInstant();

        int weekCount = clamp(weeks, DEFAULT_WEEKS, MAX_WEEKS);
        int monthCount = clamp(months, DEFAULT_MONTHS, MAX_MONTHS);
        int windowDays = clamp(days, DEFAULT_DAYS, MAX_DAYS);

        List<Car> partnerCars = cars.findByPartnerId(partnerId);
        List<UUID> carIds = partnerCars.stream().map(Car::getId).toList();

        List<RevenuePoint> byWeek = series("week", partnerId,
                today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(weekCount - 1L),
                weekCount, zone, endExclusive);
        List<RevenuePoint> byMonth = series("month", partnerId,
                today.withDayOfMonth(1).minusMonths(monthCount - 1L), monthCount, zone, endExclusive);

        Instant windowFrom = today.minusDays(windowDays - 1L).atStartOfDay(zone).toInstant();

        return new PartnerAnalyticsResponse(
                currency,
                summary(partner, partnerId, partnerCars, carIds, today, zone, now),
                byWeek,
                byMonth,
                windowDays,
                weekdays(partnerId, windowFrom, endExclusive, zone),
                nullToZero(stats.averageTripHours(partnerId, windowFrom, endExclusive)),
                utilization(partnerId, partnerCars, windowFrom, endExclusive, zone));
    }

    private Summary summary(User partner, UUID partnerId, List<Car> partnerCars, List<UUID> carIds, LocalDate today,
                            ZoneId zone, Instant now) {
        YearMonth month = YearMonth.from(today);
        Instant from = PartnerIncomeService.start(month, zone);
        Instant to = PartnerIncomeService.start(month.plusMonths(1), zone);
        BigDecimal income = BigDecimal.ZERO.setScale(2);
        if (!carIds.isEmpty()) {
            for (PartnerStatsRepository.CarIncomeRow row : stats.incomeByCar(carIds, BookingStatus.finished,
                    PartnerIncomeService.COUNTED, from, to)) {
                income = income.add(row.getIncome());
            }
        }
        long rentals = stats.countFinished(partnerId, BookingStatus.finished, from, to);
        NextBooking next = null;
        if (!carIds.isEmpty()) {
            List<Booking> upcoming = stats.upcoming(carIds, EnumSet.of(BookingStatus.pending, BookingStatus.active), now,
                    PageRequest.of(0, 1));
            if (!upcoming.isEmpty()) {
                Booking b = upcoming.get(0);
                Car car = partnerCars.stream().filter(c -> c.getId().equals(b.getCarId())).findFirst().orElse(null);
                next = new NextBooking(b.getId(), b.getCarId(), PartnerIncomeService.name(car), b.getPlannedStartAt(),
                        b.getPlannedEndAt(), b.getStatus().name());
            }
        }
        return new Summary(income, rentals, partner.getRatingAvg(), next);
    }

    /** Ряд без пропусков: периоды без поездок возвращаются с нулями, чтобы график был непрерывным. */
    private List<RevenuePoint> series(String unit, UUID partnerId, LocalDate first, int count, ZoneId zone, Instant end) {
        Map<String, Object[]> rows = new HashMap<>();
        for (Object[] row : stats.incomeByPeriod(unit, zone.getId(), partnerId, first.atStartOfDay(zone).toInstant(), end)) {
            rows.put((String) row[0], row);
        }
        List<RevenuePoint> result = new ArrayList<>(count);
        LocalDate cursor = first;
        for (int i = 0; i < count; i++) {
            Object[] row = rows.get(cursor.toString());
            result.add(new RevenuePoint(cursor.toString(),
                    row == null ? BigDecimal.ZERO.setScale(2) : decimal(row[1]),
                    row == null ? 0 : ((Number) row[2]).longValue()));
            cursor = "week".equals(unit) ? cursor.plusWeeks(1) : cursor.plusMonths(1);
        }
        return result;
    }

    private List<WeekdayStat> weekdays(UUID partnerId, Instant from, Instant to, ZoneId zone) {
        List<WeekdayStat> result = new ArrayList<>();
        for (Object[] row : stats.tripsByWeekday(zone.getId(), partnerId, from, to)) {
            int isoDay = ((Number) row[0]).intValue();
            result.add(new WeekdayStat(isoDay, DayOfWeek.of(isoDay).name(), ((Number) row[1]).longValue()));
        }
        return result;
    }

    private List<CarUtilization> utilization(UUID partnerId, List<Car> partnerCars, Instant from, Instant to, ZoneId zone) {
        Map<UUID, BigDecimal> booked = new HashMap<>();
        for (Object[] row : stats.bookedHoursByCar(partnerId, from, to)) {
            booked.put(toUuid(row[0]), decimal(row[1]));
        }
        List<CarUtilization> result = new ArrayList<>();
        for (Car car : partnerCars) {
            if (car.getModerationStatus() != ModerationStatus.approved) {
                continue;
            }
            // машина, добавленная внутри окна, считается только с момента добавления
            Instant carFrom = car.getCreatedAt() != null && car.getCreatedAt().isAfter(from) ? car.getCreatedAt() : from;
            BigDecimal available = PartnerUtilization.availableHours(car.getAvailabilitySchedule(), carFrom, to, zone);
            BigDecimal hours = booked.getOrDefault(car.getId(), BigDecimal.ZERO.setScale(2));
            result.add(new CarUtilization(car.getId(), PartnerIncomeService.name(car), hours, available,
                    PartnerUtilization.percent(hours, available)));
        }
        return result;
    }

    private static int clamp(Integer value, int defaultValue, int max) {
        if (value == null) {
            return defaultValue;
        }
        return Math.min(Math.max(value, 1), max);
    }

    private static BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value;
    }

    private static BigDecimal decimal(Object value) {
        return (value instanceof BigDecimal b ? b : new BigDecimal(String.valueOf(value))).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static UUID toUuid(Object value) {
        return value instanceof UUID u ? u : UUID.fromString(String.valueOf(value));
    }
}
