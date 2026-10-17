package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Раздел 8, 22.3: статус finished. В ТЗ не сказано, что его выставляет, — поездка считается завершённой, когда прошёл
 * её день: раз в 15 минут open/closed с датой раньше сегодняшней переводятся в finished. Простая периодическая задача —
 * Spring @Scheduled (17.1); @EnableScheduling включён в BookingSchedulingConfig. Один UPDATE по условию идемпотентен.
 * Пока задача не отработала, чат всё равно закрыт для записи по дате (GroupTripRules.chatWritable).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GroupTripSweeper {

    private final GroupTripRepository trips;

    @Value("${app.group-trips.timezone:Europe/Minsk}")
    private String timezone;

    @Scheduled(fixedDelayString = "${app.group-trips.sweep-interval-ms:900000}",
            initialDelayString = "${app.group-trips.sweep-initial-delay-ms:60000}")
    @Transactional
    public void finishPastTrips() {
        LocalDate today = LocalDate.now(ZoneId.of(timezone));
        int finished = trips.finishPastTrips(GroupTripStatus.finished,
                List.of(GroupTripStatus.open, GroupTripStatus.closed), today, Instant.now());
        if (finished > 0) {
            log.info("Групповые поездки: завершено по дате — {}", finished);
        }
    }
}
