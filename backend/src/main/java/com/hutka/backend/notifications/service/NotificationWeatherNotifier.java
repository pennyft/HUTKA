package com.hutka.backend.notifications.service;

import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.weather.WeatherRules;
import com.hutka.backend.weather.enums.WeatherCheckKind;
import com.hutka.backend.weather.service.WeatherBookingsPort;
import com.hutka.backend.weather.service.WeatherNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Реализация порта WeatherNotifier (12, 13): погодное предупреждение уходит арендатору — это «пользователь» из
 * раздела 12. Живёт в notifications — как NotificationBookingNotifier: пакет weather о уведомлениях не знает.
 * Текст не формируется: клиент строит его по type и payload.
 */
@Component
@RequiredArgsConstructor
public class NotificationWeatherNotifier implements WeatherNotifier {

    private final NotificationService notifications;

    @Override
    public void unfavorable(WeatherBookingsPort.Target target, List<WeatherRules.Warning> warnings, WeatherCheckKind kind) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", target.bookingId().toString());
        payload.put("carId", target.carId().toString());
        payload.put("car", target.carTitle());
        payload.put("plannedStartAt", target.plannedStartAt().toString());
        payload.put("plannedEndAt", target.plannedEndAt().toString());
        payload.put("check", kind.name());
        payload.put("hazards", warnings.stream().map(w -> {
            Map<String, Object> hazard = new LinkedHashMap<>();
            hazard.put("hazard", w.hazard().name());
            hazard.put("startsAt", w.startsAt().toString());
            hazard.put("endsAt", w.endsAt().toString());
            return hazard;
        }).toList());
        notifications.send(target.renterId(), NotificationType.weather_warning, payload);
    }
}
