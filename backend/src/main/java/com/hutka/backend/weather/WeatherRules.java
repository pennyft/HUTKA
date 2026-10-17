package com.hutka.backend.weather;

import com.hutka.backend.weather.enums.WeatherCheckKind;
import com.hutka.backend.weather.enums.WeatherHazard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Чистая логика погодного модуля (раздел 12) без обращения к БД и сети: что считать неблагоприятным условием, укладывается
 * ли поездка в горизонт прогноза, когда делать проверку. «Сейчас» передаётся снаружи, поэтому всё детерминированно
 * тестируется. Пороги и наборы кодов WMO — продуктовые решения, в ТЗ их нет (WEATHER_DECISIONS.md, п. 3).
 */
public final class WeatherRules {

    /** Горизонт достоверного прогноза (12): дальше 7 дней прогноз не показываем. */
    public static final Duration HORIZON = Duration.ofDays(7);
    /** Проверка «за день до начала поездки» (12, 17.2) — за 24 часа до planned_start_at. */
    public static final Duration CHECK_BEFORE_START = Duration.ofHours(24);
    /** Сколько локальных суток просим у Open-Meteo: сегодня + 7 следующих покрывают [сейчас, сейчас + 7 дней]. Параметр допускает 0–16. */
    public static final int FORECAST_DAYS = 8;
    /** Сколько суток показывает виджет: сегодня и 6 следующих (столько API отдаёт по умолчанию). */
    public static final int WIDGET_DAYS = 7;

    public static final String BEYOND_HORIZON = "beyond_horizon";
    public static final String IN_PAST = "in_past";

    private static final Duration HOUR = Duration.ofHours(1);

    // Коды WMO из таблицы документации Open-Meteo (open-meteo.com/en/docs, «WMO Weather interpretation codes»).
    /** 63 умеренный дождь, 65 сильный дождь, 81 умеренные ливни, 82 сильные ливни. Слабый дождь/морось (51–55, 61, 80) не предупреждаем. */
    static final Set<Integer> RAIN_CODES = Set.of(63, 65, 81, 82);
    /** 56/57 замерзающая морось, 66/67 замерзающий дождь. */
    static final Set<Integer> ICE_CODES = Set.of(56, 57, 66, 67);
    /** 45 туман, 48 изморозевый туман. */
    static final Set<Integer> FOG_CODES = Set.of(45, 48);
    /** 73 умеренный снег, 75 сильный снег, 86 сильные снежные заряды. */
    static final Set<Integer> SNOW_CODES = Set.of(73, 75, 86);
    /** 95 гроза, 96 с небольшим градом, 97 сильная гроза, 99 с сильным градом. */
    static final Set<Integer> THUNDER_CODES = Set.of(95, 96, 97, 99);

    private WeatherRules() {}

    /** Пороги, которые можно менять в application.yml (app.weather.*). Порывы — км/ч (единица Open-Meteo по умолчанию), видимость — метры. */
    public record Thresholds(double windGustKmh, double visibilityMeters) {
        public static final Thresholds DEFAULT = new Thresholds(60, 1000);
    }

    /** Неблагоприятное условие в окне поездки: от первого до последнего часа, где оно встречается (границы обрезаны окном). */
    public record Warning(WeatherHazard hazard, Instant startsAt, Instant endsAt) {}

    /** Окно поездки: available = false — прогноза для него нет (reason: beyond_horizon | in_past), блок прятать. */
    public record Window(boolean available, String unavailableReason, List<Warning> warnings) {}

    /** Когда и какую проверку запланировать для новой брони. */
    public record Plan(WeatherCheckKind kind, Instant at) {}

    /** Диапазон from/to из запроса. */
    public record Range(Instant from, Instant to) {}

    // ---------------------------------------------------------------- классификация погоды

    /** Какие неблагоприятные условия есть в этот час. Пустой набор — погода приемлемая. */
    public static Set<WeatherHazard> hazardsOf(WeatherData.HourPoint hour, Thresholds t) {
        Set<WeatherHazard> result = EnumSet.noneOf(WeatherHazard.class);
        Integer code = hour.weatherCode();
        if (code != null) {
            if (RAIN_CODES.contains(code)) result.add(WeatherHazard.rain);
            if (ICE_CODES.contains(code)) result.add(WeatherHazard.ice);
            if (FOG_CODES.contains(code)) result.add(WeatherHazard.fog);
            if (SNOW_CODES.contains(code)) result.add(WeatherHazard.snow);
            if (THUNDER_CODES.contains(code)) result.add(WeatherHazard.thunderstorm);
        }
        if (hour.visibilityM() != null && hour.visibilityM() < t.visibilityMeters()) {
            result.add(WeatherHazard.fog);
        }
        if (hour.windGustKmh() != null && hour.windGustKmh() >= t.windGustKmh()) {
            result.add(WeatherHazard.strong_wind);
        }
        return result;
    }

    /**
     * Условия за промежуток [from, to). Час [t, t+1ч) учитывается, если пересекается с промежутком; границы
     * предупреждения обрезаются промежутком. Порядок результата — порядок констант WeatherHazard.
     */
    public static List<Warning> warnings(List<WeatherData.HourPoint> hours, Instant from, Instant to, Thresholds t) {
        Map<WeatherHazard, Instant[]> found = new EnumMap<>(WeatherHazard.class);
        for (WeatherData.HourPoint hour : hours) {
            Instant start = hour.time();
            Instant end = start.plus(HOUR);
            if (!end.isAfter(from) || !start.isBefore(to)) continue;
            Instant clippedStart = start.isBefore(from) ? from : start;
            Instant clippedEnd = end.isAfter(to) ? to : end;
            for (WeatherHazard hazard : hazardsOf(hour, t)) {
                Instant[] span = found.get(hazard);
                if (span == null) {
                    found.put(hazard, new Instant[]{clippedStart, clippedEnd});
                } else {
                    if (clippedStart.isBefore(span[0])) span[0] = clippedStart;
                    if (clippedEnd.isAfter(span[1])) span[1] = clippedEnd;
                }
            }
        }
        List<Warning> result = new ArrayList<>();
        found.forEach((hazard, span) -> result.add(new Warning(hazard, span[0], span[1])));
        return result;
    }

    /**
     * Прогноз для окна поездки (12). Блок недоступен, если поездка начинается дальше горизонта (прогнозу не верим) или
     * уже закончилась. Начавшееся окно обрезается «сейчас», слишком длинное — горизонтом: оцениваем только то,
     * что прогноз покрывает.
     */
    public static Window window(List<WeatherData.HourPoint> hours, Instant from, Instant to, Instant now, Thresholds t) {
        if (!to.isAfter(now)) return new Window(false, IN_PAST, List.of());
        if (!withinHorizon(from, now)) return new Window(false, BEYOND_HORIZON, List.of());
        Instant effectiveFrom = from.isBefore(now) ? now : from;
        Instant horizonEnd = now.plus(HORIZON);
        Instant effectiveTo = to.isAfter(horizonEnd) ? horizonEnd : to;
        return new Window(true, null, warnings(hours, effectiveFrom, effectiveTo, t));
    }

    /** Условия за календарный день (по местному времени zone) — для виджета; уже прошедшие часы сегодняшнего дня не считаются. */
    public static List<WeatherHazard> dayHazards(List<WeatherData.HourPoint> hours, LocalDate date, ZoneId zone,
                                                 Instant now, Thresholds t) {
        Set<WeatherHazard> result = EnumSet.noneOf(WeatherHazard.class);
        for (WeatherData.HourPoint hour : hours) {
            if (!LocalDate.ofInstant(hour.time(), zone).equals(date)) continue;
            if (!hour.time().plus(HOUR).isAfter(now)) continue;
            result.addAll(hazardsOf(hour, t));
        }
        return new ArrayList<>(result);
    }

    // ---------------------------------------------------------------- горизонт и планирование проверок

    /** «Дата поездки укладывается в 7 дней от текущего момента» (12): ровно через 7 суток ещё укладывается. */
    public static boolean withinHorizon(Instant tripStart, Instant now) {
        return !tripStart.isAfter(now.plus(HORIZON));
    }

    /**
     * Какую проверку запланировать при создании брони (12, 17.2): поездка в пределах 7 дней — проверить сразу
     * (предупреждение показывает интерфейс, уведомление создаёт эта проверка); дальше — одна проверка за сутки до начала.
     */
    public static Plan plan(Instant now, Instant plannedStartAt) {
        if (withinHorizon(plannedStartAt, now)) return new Plan(WeatherCheckKind.booking, now);
        return new Plan(WeatherCheckKind.day_before, plannedStartAt.minus(CHECK_BEFORE_START));
    }

    // ---------------------------------------------------------------- проверка ввода (IllegalArgumentException)

    /** Координаты — обе или ни одной (тогда берутся координаты по умолчанию). Текст ошибки — для пользователя. */
    public static void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null && longitude == null) return;
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Укажите обе координаты: latitude и longitude");
        }
        if (latitude.isNaN() || latitude.isInfinite() || latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException("latitude должна быть от -90 до 90");
        }
        if (longitude.isNaN() || longitude.isInfinite() || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("longitude должна быть от -180 до 180");
        }
    }

    /** from и to — обе или ни одной; формат ISO 8601 с часовым поясом («2026-10-20T09:00:00Z» или со смещением). */
    public static Optional<Range> parseRange(String from, String to) {
        boolean noFrom = from == null || from.isBlank();
        boolean noTo = to == null || to.isBlank();
        if (noFrom && noTo) return Optional.empty();
        if (noFrom || noTo) {
            throw new IllegalArgumentException("Укажите оба параметра: from и to");
        }
        Instant start = parseInstant(from, "from");
        Instant end = parseInstant(to, "to");
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("to должно быть позже from");
        }
        return Optional.of(new Range(start, end));
    }

    static Instant parseInstant(String raw, String field) {
        try {
            return OffsetDateTime.parse(raw.strip()).toInstant();
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(field + ": ожидается дата и время ISO 8601 с часовым поясом, например 2026-10-20T09:00:00Z");
        }
    }

    /** Координата для запроса и ключа кэша: два знака после запятой (около километра) — меньше разных ключей и точек. */
    public static BigDecimal roundCoordinate(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
