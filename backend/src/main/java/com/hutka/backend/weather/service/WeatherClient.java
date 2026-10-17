package com.hutka.backend.weather.service;

import com.hutka.backend.weather.WeatherData;

import java.math.BigDecimal;

/**
 * Источник прогноза (17.3: Open-Meteo). Интерфейс отделяет бизнес-логику от HTTP: реализация — OpenMeteoClient,
 * в тестах и при смене провайдера подставляется другая.
 */
public interface WeatherClient {

    /** Прогноз для точки: почасовой и посуточный, на WeatherRules.FORECAST_DAYS суток вперёд. */
    WeatherData fetch(BigDecimal latitude, BigDecimal longitude);

    /** Прогноз получить не удалось (сеть, ответ не 2xx, некорректный JSON). Текст — для лога, не для пользователя. */
    class WeatherUnavailableException extends RuntimeException {
        public WeatherUnavailableException(String message) {
            super(message);
        }
    }
}
