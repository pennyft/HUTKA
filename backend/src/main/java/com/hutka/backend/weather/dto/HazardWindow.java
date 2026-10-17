package com.hutka.backend.weather.dto;

import com.hutka.backend.weather.enums.WeatherHazard;

import java.time.Instant;

/** Неблагоприятное условие в окне поездки: от первого до последнего часа, где оно ожидается. */
public record HazardWindow(WeatherHazard hazard, Instant startsAt, Instant endsAt) {}
