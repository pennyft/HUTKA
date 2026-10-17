package com.hutka.backend.weather.dto;

import com.hutka.backend.weather.enums.WeatherHazard;

import java.time.LocalDate;
import java.util.List;

/**
 * Сводка за день для виджета (10.1). weatherCode — код WMO самого тяжёлого условия дня; API отдаёт только число,
 * подпись и иконку по таблице кодов подбирает клиент. hazards — неблагоприятные условия дня (пусто — погода приемлемая).
 */
public record DayForecast(LocalDate date, Integer weatherCode, Double temperatureMinC, Double temperatureMaxC,
                          Double precipitationSumMm, Double windGustMaxKmh, List<WeatherHazard> hazards) {}
