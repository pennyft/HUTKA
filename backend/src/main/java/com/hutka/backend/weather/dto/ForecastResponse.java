package com.hutka.backend.weather.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * GET /weather/forecast (23.11). source — атрибуция: показывать рядом с прогнозом (данные Open-Meteo под CC BY 4.0).
 * horizonEnd — до какого момента прогнозу верим (12: 7 дней). latitude/longitude — координаты, для которых получен
 * прогноз (округлены до сотых). window — null, если from/to не передавались.
 */
public record ForecastResponse(String source, String timezone, Instant fetchedAt, Instant horizonEnd,
                               BigDecimal latitude, BigDecimal longitude, List<DayForecast> days,
                               WindowForecast window) {}
