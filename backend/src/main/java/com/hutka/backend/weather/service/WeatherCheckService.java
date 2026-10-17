package com.hutka.backend.weather.service;

import com.hutka.backend.weather.WeatherCheckRepository;
import com.hutka.backend.weather.WeatherData;
import com.hutka.backend.weather.WeatherRules;
import com.hutka.backend.weather.enums.WeatherCheckKind;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Проверка погоды по брони (12, 17.2): вызывается задачей Quartz WeatherCheckJob. Берёт свежий прогноз для машины,
 * сопоставляет с окном [planned_start_at, planned_end_at] и, если условия неблагоприятные, уведомляет арендатора.
 * Если прогноз получить не удалось — бросает WeatherUnavailableException, задача сама повторит попытку.
 * Сам метод не транзакционный: запись и уведомление — в WeatherCheckRecorder.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherCheckService {

    public enum Outcome {
        /** Условия неблагоприятные, арендатору отправлено уведомление. */
        NOTIFIED,
        /** Погода приемлемая, уведомления нет. */
        NO_HAZARDS,
        /** Проверка не нужна: брони нет, она отменена/начата, у машины нет координат или прогноз её окну не соответствует. */
        SKIPPED,
        /** Такая проверка по этой брони уже выполнена. */
        ALREADY_CHECKED
    }

    private final WeatherBookingsPort bookings;
    private final WeatherService weather;
    private final WeatherCheckRepository checks;
    private final WeatherCheckRecorder recorder;

    public Outcome check(UUID bookingId, WeatherCheckKind kind) {
        WeatherBookingsPort.Target target = bookings.find(bookingId).orElse(null);
        if (target == null || !target.awaitingStart()) {
            log.info("Погода по брони {}: проверка пропущена — брони нет, она отменена или поездка уже начата", bookingId);
            return Outcome.SKIPPED;
        }
        if (checks.existsByBookingIdAndKind(bookingId, kind)) {
            return Outcome.ALREADY_CHECKED;
        }
        if (target.latitude() == null || target.longitude() == null) {
            log.warn("Погода по брони {}: у машины {} нет координат, проверка пропущена", bookingId, target.carId());
            return Outcome.SKIPPED;
        }

        Instant now = Instant.now();
        WeatherData data = weather.load(WeatherRules.roundCoordinate(target.latitude().doubleValue()),
                WeatherRules.roundCoordinate(target.longitude().doubleValue()), true);
        WeatherRules.Window window = WeatherRules.window(data.hours(), target.plannedStartAt(), target.plannedEndAt(),
                now, weather.thresholds());
        if (!window.available()) {
            log.info("Погода по брони {}: окно поездки вне прогноза ({}), проверка пропущена", bookingId, window.unavailableReason());
            return Outcome.SKIPPED;
        }

        try {
            Outcome outcome = recorder.record(target, kind, window.warnings());
            log.info("Погода по брони {} ({}): {}", bookingId, kind, outcome);
            return outcome;
        } catch (DataIntegrityViolationException e) {
            // параллельный запуск успел записать эту проверку раньше (UNIQUE booking_id + kind в V13)
            return Outcome.ALREADY_CHECKED;
        }
    }
}
