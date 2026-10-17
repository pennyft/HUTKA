package com.hutka.backend.car.schedule;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.car.schedule.AvailabilitySchedule.Window;
import lombok.extern.slf4j.Slf4j;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Разбор Car.availabilitySchedule (JSON-строка в jsonb). Формат:
 * <pre>
 * {
 *   "mon": [{"from": "08:00", "to": "22:00"}],
 *   "tue": [{"from": "08:00", "to": "12:00"}, {"from": "14:00", "to": "24:00"}],
 *   "sat": [{"from": "00:00", "to": "24:00"}],
 *   "sun": []
 * }
 * </pre>
 * Ключи — mon, tue, wed, thu, fri, sat, sun. Если расписание в целом не задано (null, пусто, "null" или {}) — ограничений нет.
 * Если расписание задано, то день без ключа или с пустым списком — машина в этот день недоступна.
 */
@Slf4j
public final class AvailabilityScheduleParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final Map<String, DayOfWeek> DAY_KEYS = Map.of(
            "mon", DayOfWeek.MONDAY, "tue", DayOfWeek.TUESDAY, "wed", DayOfWeek.WEDNESDAY,
            "thu", DayOfWeek.THURSDAY, "fri", DayOfWeek.FRIDAY, "sat", DayOfWeek.SATURDAY,
            "sun", DayOfWeek.SUNDAY);

    private AvailabilityScheduleParser() {}

    /**
     * Строгий разбор — для проверки при создании и редактировании машины.
     *
     * @return расписание или empty, если ограничений нет
     * @throws IllegalArgumentException формат нарушен (сообщение пригодно для показа партнёру)
     */
    public static Optional<AvailabilitySchedule> parse(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        JsonNode root;
        try {
            root = MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("должно быть корректным JSON");
        }
        if (root == null || root.isNull() || root.isMissingNode()) {
            return Optional.empty();
        }
        if (!root.isObject()) {
            throw new IllegalArgumentException(
                    "должно быть JSON-объектом вида {\"mon\":[{\"from\":\"08:00\",\"to\":\"22:00\"}], ...}");
        }
        if (root.isEmpty()) {
            return Optional.empty();
        }
        Map<DayOfWeek, List<Window>> raw = new EnumMap<>(DayOfWeek.class);
        Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            DayOfWeek day = DAY_KEYS.get(entry.getKey());
            if (day == null) {
                throw new IllegalArgumentException(
                        "неизвестный ключ \"" + entry.getKey() + "\"; допустимы: mon, tue, wed, thu, fri, sat, sun");
            }
            if (!entry.getValue().isArray()) {
                throw new IllegalArgumentException("для \"" + entry.getKey() + "\" нужен массив окон (может быть пустым)");
            }
            List<Window> windows = new ArrayList<>();
            for (JsonNode node : entry.getValue()) {
                if (!node.isObject() || !node.path("from").isTextual() || !node.path("to").isTextual()) {
                    throw new IllegalArgumentException("окно в \"" + entry.getKey()
                            + "\" должно иметь вид {\"from\":\"08:00\",\"to\":\"22:00\"}");
                }
                windows.add(new Window(
                        AvailabilitySchedule.parseTime(node.get("from").asText(), false),
                        AvailabilitySchedule.parseTime(node.get("to").asText(), true)));
            }
            raw.put(day, windows);
        }
        return Optional.of(new AvailabilitySchedule(raw));
    }

    /**
     * Мягкий разбор — для проверки при создании брони. Данные, записанные до введения формата, могут быть
     * в любом виде: такая машина не должна навсегда терять возможность бронирования, поэтому при ошибке формата
     * ограничений нет (в лог пишется предупреждение). Новые значения строго проверяет {@link #parse}.
     */
    public static Optional<AvailabilitySchedule> parseLenient(String json) {
        try {
            return parse(json);
        } catch (IllegalArgumentException e) {
            log.warn("Расписание доступности в БД не соответствует формату, ограничений нет: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
