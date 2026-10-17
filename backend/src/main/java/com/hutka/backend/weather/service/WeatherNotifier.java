package com.hutka.backend.weather.service;

import com.hutka.backend.weather.WeatherRules;
import com.hutka.backend.weather.enums.WeatherCheckKind;

import java.util.List;

/**
 * Погодное уведомление арендатору (12, 13). Порт: реализация — notifications/service/NotificationWeatherNotifier
 * (тот же приём, что BookingNotifier). Вызывается внутри транзакции проверки, поэтому уведомление и отметка
 * о проверке (weather_checks) фиксируются вместе.
 */
public interface WeatherNotifier {

    void unfavorable(WeatherBookingsPort.Target target, List<WeatherRules.Warning> warnings, WeatherCheckKind kind);
}
