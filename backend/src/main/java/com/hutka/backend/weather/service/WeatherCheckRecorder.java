package com.hutka.backend.weather.service;

import com.hutka.backend.weather.WeatherCheck;
import com.hutka.backend.weather.WeatherCheckRepository;
import com.hutka.backend.weather.WeatherRules;
import com.hutka.backend.weather.enums.WeatherCheckKind;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Короткая транзакция проверки: отметка в weather_checks и уведомление фиксируются вместе. Вынесена в отдельный бин,
 * чтобы HTTP-запрос к Open-Meteo в WeatherCheckService выполнялся вне транзакции (не держим соединение с БД,
 * пока ждём внешний сервис), а @Transactional срабатывал через прокси.
 */
@Service
@RequiredArgsConstructor
public class WeatherCheckRecorder {

    private final WeatherCheckRepository checks;
    private final WeatherNotifier notifier;

    /**
     * saveAndFlush до уведомления: если уникальный ключ (booking_id, kind) уже занят, исключение вылетает здесь,
     * транзакция откатывается и уведомление не создаётся.
     */
    @Transactional
    public WeatherCheckService.Outcome record(WeatherBookingsPort.Target target, WeatherCheckKind kind,
                                              List<WeatherRules.Warning> warnings) {
        boolean notify = !warnings.isEmpty();
        checks.saveAndFlush(WeatherCheck.builder()
                .bookingId(target.bookingId())
                .kind(kind)
                .hazards(String.join(",", warnings.stream().map(w -> w.hazard().name()).toList()))
                .notified(notify)
                .build());
        if (notify) {
            notifier.unfavorable(target, warnings, kind);
        }
        return notify ? WeatherCheckService.Outcome.NOTIFIED : WeatherCheckService.Outcome.NO_HAZARDS;
    }
}
