package com.hutka.backend.partner.service;

import com.hutka.backend.car.schedule.AvailabilitySchedule;
import com.hutka.backend.car.schedule.AvailabilityScheduleParser;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;

/**
 * Раздел 10.5: «Загруженность каждой машины в процентах» = часы фактических поездок / часы, доступные по расписанию
 * (9.1, availability_schedule) за окно. Расписание проверяется шагом 15 минут (окна в нём задаются с точностью до минуты);
 * без расписания машина считается доступной круглосуточно. Чистая логика — без Spring.
 */
final class PartnerUtilization {

    private static final Duration STEP = Duration.ofMinutes(15);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private PartnerUtilization() {}

    static BigDecimal availableHours(String scheduleJson, Instant from, Instant to, ZoneId zone) {
        if (!to.isAfter(from)) {
            return BigDecimal.ZERO.setScale(2);
        }
        Optional<AvailabilitySchedule> schedule = AvailabilityScheduleParser.parseLenient(scheduleJson);
        long minutes;
        if (schedule.isEmpty()) {
            minutes = Duration.between(from, to).toMinutes();
        } else {
            minutes = 0;
            for (Instant cursor = from; cursor.isBefore(to); cursor = cursor.plus(STEP)) {
                Instant end = cursor.plus(STEP).isAfter(to) ? to : cursor.plus(STEP);
                if (schedule.get().covers(cursor, end, zone)) {
                    minutes += Duration.between(cursor, end).toMinutes();
                }
            }
        }
        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    /** null, если доступных часов нет; больше 100% не бывает (поездка могла выйти за расписание — берём 100). */
    static BigDecimal percent(BigDecimal booked, BigDecimal available) {
        if (available.signum() <= 0) {
            return null;
        }
        return booked.multiply(HUNDRED).divide(available, 1, RoundingMode.HALF_UP).min(HUNDRED.setScale(1));
    }
}
