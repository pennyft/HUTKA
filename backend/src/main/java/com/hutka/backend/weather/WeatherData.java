package com.hutka.backend.weather;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Разобранный ответ Open-Meteo: почасовые точки (по ним ищем неблагоприятные условия) и сводки по дням (для виджета).
 * Любое числовое поле может быть null — модель не всегда отдаёт все переменные (например, видимость).
 */
public record WeatherData(List<HourPoint> hours, List<DayPoint> days, Instant fetchedAt) {

    /** Один час прогноза. time — начало часа; weatherCode — код WMO (hourly.weather_code). */
    public record HourPoint(Instant time, Integer weatherCode, Double temperatureC, Double precipitationMm,
                            Double windGustKmh, Double visibilityM) {}

    /** Сводка за календарный день по местному времени. weatherCode — самое тяжёлое условие дня (daily.weather_code). */
    public record DayPoint(LocalDate date, Integer weatherCode, Double temperatureMinC, Double temperatureMaxC,
                           Double precipitationSumMm, Double windGustMaxKmh) {}
}
