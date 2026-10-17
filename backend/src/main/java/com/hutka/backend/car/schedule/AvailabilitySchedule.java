package com.hutka.backend.car.schedule;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Раздел 9.1 и 10.3: «расписание доступности по дням и часам». Формат в Hutka.md не задан — выбран такой JSON
 * (см. AvailabilityScheduleParser): для каждого дня недели список окон «с — по», время локальное (часовой пояс платформы).
 *
 * Правило: аренда допустима, только если ВЕСЬ интервал [начало, конец) лежит внутри окон доступности. Если аренда
 * переходит через полночь, каждая её часть должна попадать в окна своего дня. День без окон — машина в этот день недоступна.
 * Соседние окна (08:00–12:00 и 12:00–20:00) объединяются. Конец суток записывается как 24:00.
 *
 * Класс не зависит от Spring и Jackson (чистая логика).
 */
public final class AvailabilitySchedule {

    /** Окно в минутах от полуночи: 0 ≤ from < to ≤ 1440. */
    public record Window(int fromMinute, int toMinute) {}

    static final int MINUTES_IN_DAY = 24 * 60;
    static final int MAX_WINDOWS_PER_DAY = 10;
    /** Защита от аренды «на годы»: цикл идёт по дням, поэтому длина интервала ограничена. */
    static final int MAX_SCAN_DAYS = 400;

    private static final Map<DayOfWeek, String> DAY_NAMES = new EnumMap<>(DayOfWeek.class);

    static {
        DAY_NAMES.put(DayOfWeek.MONDAY, "понедельник");
        DAY_NAMES.put(DayOfWeek.TUESDAY, "вторник");
        DAY_NAMES.put(DayOfWeek.WEDNESDAY, "среда");
        DAY_NAMES.put(DayOfWeek.THURSDAY, "четверг");
        DAY_NAMES.put(DayOfWeek.FRIDAY, "пятница");
        DAY_NAMES.put(DayOfWeek.SATURDAY, "суббота");
        DAY_NAMES.put(DayOfWeek.SUNDAY, "воскресенье");
    }

    private final Map<DayOfWeek, List<Window>> windowsByDay = new EnumMap<>(DayOfWeek.class);

    /** @throws IllegalArgumentException окна некорректны: выходят за сутки, from ≥ to, пересекаются или их больше 10 в день */
    public AvailabilitySchedule(Map<DayOfWeek, List<Window>> raw) {
        for (DayOfWeek day : DayOfWeek.values()) {
            windowsByDay.put(day, normalize(day, raw.getOrDefault(day, List.of())));
        }
    }

    /** «ЧЧ:ММ» → минуты от полуночи. «24:00» допустимо только как конец окна. */
    public static int parseTime(String text, boolean allowEndOfDay) {
        if (text != null && text.matches("([01]\\d|2[0-3]):[0-5]\\d")) {
            return Integer.parseInt(text.substring(0, 2)) * 60 + Integer.parseInt(text.substring(3, 5));
        }
        if (allowEndOfDay && "24:00".equals(text)) {
            return MINUTES_IN_DAY;
        }
        throw new IllegalArgumentException("время должно быть в формате ЧЧ:ММ, например 08:30"
                + (allowEndOfDay ? " (конец суток — 24:00)" : "") + "; получено: " + text);
    }

    /** true, если весь интервал [start, end) попадает в окна доступности (время сверяется в часовом поясе zone). */
    public boolean covers(Instant start, Instant end, ZoneId zone) {
        LocalDateTime cursor = LocalDateTime.ofInstant(start, zone);
        LocalDateTime endLocal = LocalDateTime.ofInstant(end, zone);
        int scannedDays = 0;
        while (cursor.isBefore(endLocal)) {
            if (++scannedDays > MAX_SCAN_DAYS) {
                return false;
            }
            LocalDate day = cursor.toLocalDate();
            LocalDateTime nextMidnight = day.plusDays(1).atStartOfDay();
            // начало округляется вниз, конец — вверх: интервал не может «вылезти» за окно на доли минуты
            int from = cursor.getHour() * 60 + cursor.getMinute();
            int to = endLocal.isBefore(nextMidnight) ? ceilMinutes(endLocal) : MINUTES_IN_DAY;
            if (!dayCovers(day.getDayOfWeek(), from, to)) {
                return false;
            }
            cursor = nextMidnight;
        }
        return true;
    }

    private boolean dayCovers(DayOfWeek day, int from, int to) {
        for (Window window : windowsByDay.get(day)) {
            if (window.fromMinute() <= from && to <= window.toMinute()) {
                return true;
            }
        }
        return false;
    }

    private static int ceilMinutes(LocalDateTime time) {
        int minutes = time.getHour() * 60 + time.getMinute();
        return time.getSecond() > 0 || time.getNano() > 0 ? minutes + 1 : minutes;
    }

    private static List<Window> normalize(DayOfWeek day, List<Window> windows) {
        if (windows.size() > MAX_WINDOWS_PER_DAY) {
            throw new IllegalArgumentException(DAY_NAMES.get(day) + ": не более " + MAX_WINDOWS_PER_DAY + " окон в день");
        }
        List<Window> sorted = new ArrayList<>(windows);
        for (Window w : sorted) {
            if (w.fromMinute() < 0 || w.toMinute() > MINUTES_IN_DAY || w.fromMinute() >= w.toMinute()) {
                throw new IllegalArgumentException(DAY_NAMES.get(day)
                        + ": в каждом окне время начала должно быть раньше времени окончания в пределах суток");
            }
        }
        sorted.sort(Comparator.comparingInt(Window::fromMinute));
        List<Window> merged = new ArrayList<>();
        for (Window w : sorted) {
            if (merged.isEmpty()) {
                merged.add(w);
                continue;
            }
            Window last = merged.get(merged.size() - 1);
            if (w.fromMinute() < last.toMinute()) {
                throw new IllegalArgumentException(DAY_NAMES.get(day) + ": окна доступности пересекаются");
            }
            if (w.fromMinute() == last.toMinute()) {
                merged.set(merged.size() - 1, new Window(last.fromMinute(), w.toMinute()));
            } else {
                merged.add(w);
            }
        }
        return List.copyOf(merged);
    }
}
