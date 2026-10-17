package com.hutka.backend.weather;

import com.fasterxml.jackson.databind.JsonNode;
import com.hutka.backend.weather.service.WeatherClient.WeatherUnavailableException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Разбор JSON ответа /v1/forecast Open-Meteo без сети — тестируется на готовых строках. Формат: hourly/daily
 * с массивом time и параллельными массивами переменных; время — локальное без смещения («2022-07-01T00:00»), смещение
 * в utc_offset_seconds (документация: «To reproduce the API's dates and times, format them using utc_offset_seconds»).
 * Ошибка API приходит как {"error": true, "reason": "..."} с HTTP 400. Пустое/отсутствующее значение переменной — null.
 */
public final class OpenMeteoParser {

    private OpenMeteoParser() {}

    public static WeatherData parse(JsonNode root, Instant fetchedAt) {
        if (root == null || !root.isObject()) {
            throw new WeatherUnavailableException("Ответ Open-Meteo не является JSON-объектом");
        }
        if (root.path("error").asBoolean(false)) {
            throw new WeatherUnavailableException("Open-Meteo вернул ошибку: " + root.path("reason").asText("причина не указана"));
        }
        JsonNode offsetNode = root.path("utc_offset_seconds");
        if (!offsetNode.isNumber()) {
            throw new WeatherUnavailableException("В ответе Open-Meteo нет utc_offset_seconds");
        }
        ZoneOffset offset;
        try {
            offset = ZoneOffset.ofTotalSeconds(offsetNode.asInt());
        } catch (java.time.DateTimeException e) {
            throw new WeatherUnavailableException("В ответе Open-Meteo некорректный utc_offset_seconds: " + offsetNode.asText());
        }
        return new WeatherData(parseHours(root.path("hourly"), offset), parseDays(root.path("daily")), fetchedAt);
    }

    private static List<WeatherData.HourPoint> parseHours(JsonNode hourly, ZoneOffset offset) {
        JsonNode times = hourly.path("time");
        if (!times.isArray() || times.isEmpty()) {
            throw new WeatherUnavailableException("В ответе Open-Meteo нет почасового прогноза (hourly.time)");
        }
        List<WeatherData.HourPoint> hours = new ArrayList<>(times.size());
        for (int i = 0; i < times.size(); i++) {
            Instant time;
            try {
                time = LocalDateTime.parse(times.get(i).asText()).toInstant(offset);
            } catch (DateTimeParseException e) {
                throw new WeatherUnavailableException("Некорректное время в hourly.time: " + times.get(i).asText());
            }
            hours.add(new WeatherData.HourPoint(time,
                    integer(hourly.path("weather_code"), i),
                    number(hourly.path("temperature_2m"), i),
                    number(hourly.path("precipitation"), i),
                    number(hourly.path("wind_gusts_10m"), i),
                    number(hourly.path("visibility"), i)));
        }
        return hours;
    }

    private static List<WeatherData.DayPoint> parseDays(JsonNode daily) {
        JsonNode times = daily.path("time");
        if (!times.isArray() || times.isEmpty()) {
            throw new WeatherUnavailableException("В ответе Open-Meteo нет посуточного прогноза (daily.time)");
        }
        List<WeatherData.DayPoint> days = new ArrayList<>(times.size());
        for (int i = 0; i < times.size(); i++) {
            LocalDate date;
            try {
                date = LocalDate.parse(times.get(i).asText());
            } catch (DateTimeParseException e) {
                throw new WeatherUnavailableException("Некорректная дата в daily.time: " + times.get(i).asText());
            }
            days.add(new WeatherData.DayPoint(date,
                    integer(daily.path("weather_code"), i),
                    number(daily.path("temperature_2m_min"), i),
                    number(daily.path("temperature_2m_max"), i),
                    number(daily.path("precipitation_sum"), i),
                    number(daily.path("wind_gusts_10m_max"), i)));
        }
        return days;
    }

    /** i-й элемент массива как число; нет массива, короче, null или не число — null. */
    private static Double number(JsonNode array, int i) {
        if (!array.isArray() || i >= array.size()) return null;
        JsonNode node = array.get(i);
        return node.isNumber() ? node.asDouble() : null;
    }

    private static Integer integer(JsonNode array, int i) {
        Double value = number(array, i);
        return value == null ? null : (int) Math.round(value);
    }
}
