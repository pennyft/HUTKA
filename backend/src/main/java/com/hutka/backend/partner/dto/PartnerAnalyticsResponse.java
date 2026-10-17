package com.hutka.backend.partner.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 10.1 (метрики дашборда — блок summary) и 10.5 (аналитика). Все суммы — в валюте платформы (currency).
 * Периоды рядов — понедельник недели / первое число месяца в часовом поясе платформы (Europe/Minsk по умолчанию), ISO-дата.
 */
public record PartnerAnalyticsResponse(
        String currency,
        Summary summary,
        List<RevenuePoint> revenueByWeek,
        List<RevenuePoint> revenueByMonth,
        int windowDays,
        List<WeekdayStat> topWeekdays,
        BigDecimal averageRentalHours,
        List<CarUtilization> carUtilization) {

    /** monthIncome / monthRentals — текущий календарный месяц; nextBooking — null, если ближайших броней нет. */
    public record Summary(BigDecimal monthIncome, long monthRentals, BigDecimal ratingAvg, NextBooking nextBooking) {}

    public record NextBooking(UUID bookingId, UUID carId, String car, Instant plannedStartAt, Instant plannedEndAt,
                              String status) {}

    public record RevenuePoint(String periodStart, BigDecimal income, long trips) {}

    /** isoDay: 1 — понедельник … 7 — воскресенье; dayOfWeek — имя java.time.DayOfWeek (MONDAY …). */
    public record WeekdayStat(int isoDay, String dayOfWeek, long trips) {}

    /** utilizationPercent — null, если по расписанию в окне нет доступных часов. */
    public record CarUtilization(UUID carId, String car, BigDecimal bookedHours, BigDecimal availableHours,
                                 BigDecimal utilizationPercent) {}
}
