package com.hutka.backend.weather.service;

import com.hutka.backend.weather.WeatherData;
import com.hutka.backend.weather.WeatherRules;
import com.hutka.backend.weather.dto.DayForecast;
import com.hutka.backend.weather.dto.ForecastResponse;
import com.hutka.backend.weather.dto.HazardWindow;
import com.hutka.backend.weather.dto.WindowForecast;
import com.hutka.backend.weather.service.WeatherClient.WeatherUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * GET /weather/forecast (23.11, 12) и общая загрузка прогноза для проверки броней. Прогноз кэшируется в памяти по
 * округлённым координатам: бесплатный API Open-Meteo ограничен 10 000 запросов в сутки, 5 000 в час и 600 в минуту
 * (open-meteo.com/en/terms), а виджет открывают часто. Кэш — на один экземпляр приложения, как SimpleBroker (17.1).
 */
@Slf4j
@Service
public class WeatherService {

    /** Атрибуция: данные Open-Meteo распространяются по CC BY 4.0 — клиент показывает источник рядом с прогнозом. */
    static final String SOURCE = "Open-Meteo.com";
    private static final int CACHE_MAX_ENTRIES = 500;

    private record Cached(WeatherData data, Instant expiresAt) {}

    private final WeatherClient client;
    private final ZoneId zone;
    private final WeatherRules.Thresholds thresholds;
    private final BigDecimal defaultLatitude;
    private final BigDecimal defaultLongitude;
    private final Duration cacheTtl;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public WeatherService(
            WeatherClient client,
            @Value("${app.weather.timezone:Europe/Minsk}") String timezone,
            @Value("${app.weather.wind-gust-threshold-kmh:60}") double windGustKmh,
            @Value("${app.weather.visibility-threshold-m:1000}") double visibilityMeters,
            @Value("${app.weather.default-latitude:53.9006}") double defaultLatitude,
            @Value("${app.weather.default-longitude:27.5590}") double defaultLongitude,
            @Value("${app.weather.cache-ttl-minutes:60}") long cacheTtlMinutes) {
        this.client = client;
        this.zone = ZoneId.of(timezone);
        this.thresholds = new WeatherRules.Thresholds(windGustKmh, visibilityMeters);
        this.defaultLatitude = WeatherRules.roundCoordinate(defaultLatitude);
        this.defaultLongitude = WeatherRules.roundCoordinate(defaultLongitude);
        this.cacheTtl = Duration.ofMinutes(cacheTtlMinutes);
    }

    public WeatherRules.Thresholds thresholds() {
        return thresholds;
    }

    // ---------------------------------------------------------------- GET /weather/forecast

    /**
     * Прогноз на ближайшие дни для виджета (10.1) и, если переданы from/to, предупреждения для окна поездки (12).
     * Без координат берутся координаты по умолчанию (app.weather.default-*).
     */
    public ForecastResponse forecast(Double latitude, Double longitude, String from, String to) {
        Optional<WeatherRules.Range> range;
        try {
            WeatherRules.validateCoordinates(latitude, longitude);
            range = WeatherRules.parseRange(from, to);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        BigDecimal lat = latitude == null ? defaultLatitude : WeatherRules.roundCoordinate(latitude);
        BigDecimal lon = longitude == null ? defaultLongitude : WeatherRules.roundCoordinate(longitude);

        WeatherData data;
        try {
            data = load(lat, lon, false);
        } catch (WeatherUnavailableException e) {
            log.warn("GET /weather/forecast: прогноз недоступен: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Сервис прогноза погоды временно недоступен. Попробуйте позже");
        }

        Instant now = Instant.now();
        LocalDate today = LocalDate.ofInstant(now, zone);
        List<DayForecast> days = data.days().stream()
                .filter(d -> !d.date().isBefore(today) && d.date().isBefore(today.plusDays(WeatherRules.WIDGET_DAYS)))
                .map(d -> new DayForecast(d.date(), d.weatherCode(), d.temperatureMinC(), d.temperatureMaxC(),
                        d.precipitationSumMm(), d.windGustMaxKmh(),
                        WeatherRules.dayHazards(data.hours(), d.date(), zone, now, thresholds)))
                .toList();
        WindowForecast window = range.map(r -> toWindow(r, WeatherRules.window(data.hours(), r.from(), r.to(), now, thresholds)))
                .orElse(null);
        return new ForecastResponse(SOURCE, zone.getId(), data.fetchedAt(), now.plus(WeatherRules.HORIZON), lat, lon, days, window);
    }

    private static WindowForecast toWindow(WeatherRules.Range range, WeatherRules.Window window) {
        return new WindowForecast(range.from(), range.to(), window.available(), window.unavailableReason(),
                window.warnings().stream().map(w -> new HazardWindow(w.hazard(), w.startsAt(), w.endsAt())).toList());
    }

    // ---------------------------------------------------------------- загрузка с кэшем

    /**
     * Прогноз для точки. fresh = true пропускает кэш (проверка брони должна опираться на свежие данные) и обновляет его.
     * Параллельные промахи по одному ключу могут дать два запроса — осознанно: блокировка дороже редкого дубля.
     */
    public WeatherData load(BigDecimal latitude, BigDecimal longitude, boolean fresh) {
        String key = latitude.toPlainString() + "," + longitude.toPlainString();
        Instant now = Instant.now();
        if (!fresh) {
            Cached cached = cache.get(key);
            if (cached != null && cached.expiresAt().isAfter(now)) {
                return cached.data();
            }
        }
        WeatherData data = client.fetch(latitude, longitude);
        if (cache.size() >= CACHE_MAX_ENTRIES) {
            cache.values().removeIf(c -> !c.expiresAt().isAfter(now));
            if (cache.size() >= CACHE_MAX_ENTRIES) cache.clear();
        }
        cache.put(key, new Cached(data, now.plus(cacheTtl)));
        return data;
    }
}
