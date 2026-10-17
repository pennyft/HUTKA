package com.hutka.backend.weather.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.weather.OpenMeteoParser;
import com.hutka.backend.weather.WeatherData;
import com.hutka.backend.weather.WeatherRules;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.List;

/**
 * Клиент Open-Meteo Forecast API (GET /v1/forecast). Бесплатный endpoint api.open-meteo.com разрешён только для
 * некоммерческого использования; для коммерческого — customer-api.open-meteo.com с параметром apikey (WEATHER_DECISIONS.md, п. 1).
 * Поэтому base-url и api-key настраиваются, а ключ никогда не попадает в лог: RestTemplate кладёт полный URL в текст
 * исключений, поэтому все сообщения проходят sanitize().
 */
@Slf4j
@Service
public class OpenMeteoClient implements WeatherClient {

    private static final String HOURLY = "weather_code,temperature_2m,precipitation,wind_gusts_10m,visibility";
    private static final String DAILY = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String apiKey;
    private final String timezone;

    public OpenMeteoClient(
            ObjectMapper objectMapper,
            @Value("${app.weather.base-url:https://api.open-meteo.com}") String baseUrl,
            @Value("${app.weather.api-key:}") String apiKey,
            @Value("${app.weather.timezone:Europe/Minsk}") String timezone,
            @Value("${app.weather.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${app.weather.read-timeout-ms:8000}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.timezone = timezone;
    }

    @Override
    public WeatherData fetch(BigDecimal latitude, BigDecimal longitude) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/v1/forecast")
                .queryParam("latitude", latitude.toPlainString())
                .queryParam("longitude", longitude.toPlainString())
                .queryParam("hourly", HOURLY)
                .queryParam("daily", DAILY)
                .queryParam("wind_speed_unit", "kmh")
                .queryParam("timezone", timezone)
                .queryParam("forecast_days", WeatherRules.FORECAST_DAYS);
        if (!apiKey.isEmpty()) {
            builder.queryParam("apikey", apiKey);
        }
        URI uri = builder.build().encode().toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        String raw;
        try {
            raw = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), String.class).getBody();
        } catch (HttpStatusCodeException e) {
            logHttpError(e.getStatusCode(), e.getResponseBodyAsString());
            throw new WeatherUnavailableException("Open-Meteo вернул " + e.getStatusCode().value());
        } catch (RestClientException e) {
            log.warn("Open-Meteo недоступен: {}", sanitize(e.getMessage()));
            throw new WeatherUnavailableException("Open-Meteo недоступен");
        }

        try {
            return OpenMeteoParser.parse(objectMapper.readTree(raw), Instant.now());
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new WeatherUnavailableException("Некорректный ответ Open-Meteo");
        }
    }

    private static void logHttpError(HttpStatusCode status, String body) {
        String shortBody = sanitize(body.length() > 300 ? body.substring(0, 300) : body);
        switch (status.value()) {
            case 400 -> log.error("Open-Meteo: 400 — запрос отклонён (ошибка в параметрах): {}", shortBody);
            case 401, 403 -> log.error("Open-Meteo: {} — проверьте app.weather.api-key и base-url (коммерческий план)", status.value());
            case 429 -> log.warn("Open-Meteo: 429 — превышен лимит запросов");
            default -> log.warn("Open-Meteo вернул {}: {}", status.value(), shortBody);
        }
    }

    /** Убирает ключ из текста, который может содержать URL запроса. */
    static String sanitize(String text) {
        return text == null ? "" : text.replaceAll("apikey=[^&\\s\"]+", "apikey=***");
    }
}
