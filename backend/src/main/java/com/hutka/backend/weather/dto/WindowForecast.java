package com.hutka.backend.weather.dto;

import java.time.Instant;
import java.util.List;

/**
 * Предупреждения для окна поездки (12). available = false — погодный блок показывать не нужно:
 * beyond_horizon — поездка дальше 7 дней, in_past — окно уже закончилось.
 */
public record WindowForecast(Instant from, Instant to, boolean available, String unavailableReason,
                             List<HazardWindow> warnings) {}
