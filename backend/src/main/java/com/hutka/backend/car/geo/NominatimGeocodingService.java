package com.hutka.backend.car.geo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * Раздел 4.2 / 17.3: геокодинг через Nominatim (OpenStreetMap).
 * Публичный сервер допускает не более 1 запроса в секунду и требует User-Agent, идентифицирующий приложение —
 * поэтому задайте app.geocoding.user-agent со своим контактом.
 */
@Slf4j
@Service
public class NominatimGeocodingService implements GeocodingService {

    private static final long MIN_INTERVAL_MS = 1_100;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String userAgent;

    private long lastCallAtMs = 0;

    public NominatimGeocodingService(
            ObjectMapper objectMapper,
            @Value("${app.geocoding.base-url:https://nominatim.openstreetmap.org}") String baseUrl,
            @Value("${app.geocoding.user-agent:HUTKA-backend/1.0 (set app.geocoding.user-agent with a contact email)}")
            String userAgent
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(5_000);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.userAgent = userAgent;
    }

    @Override
    public Coordinates geocode(String address) {
        URI uri = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/search")
                .queryParam("format", "jsonv2")
                .queryParam("limit", 1)
                .queryParam("countrycodes", "by")
                .queryParam("q", "{q}")
                .buildAndExpand(Map.of("q", address))
                .encode()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, userAgent);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        throttle();

        JsonNode root;
        try {
            ResponseEntity<String> response =
                    restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            root = objectMapper.readTree(response.getBody());
        } catch (RestClientException | JsonProcessingException | IllegalArgumentException e) {
            log.warn("Nominatim недоступен или вернул некорректный ответ: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Сервис определения координат временно недоступен. Попробуйте позже");
        }

        if (root == null || !root.isArray() || root.size() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Не удалось найти адрес на карте. Уточните район, улицу и номер дома");
        }

        JsonNode first = root.get(0);
        try {
            return new Coordinates(
                    new BigDecimal(first.get("lat").asText()).setScale(7, RoundingMode.HALF_UP),
                    new BigDecimal(first.get("lon").asText()).setScale(7, RoundingMode.HALF_UP));
        } catch (NullPointerException | NumberFormatException e) {
            log.warn("Неожиданный формат ответа Nominatim: {}", first);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Сервис определения координат временно недоступен. Попробуйте позже");
        }
    }

    /** Ограничение политики Nominatim: не чаще 1 запроса в секунду (в пределах одного экземпляра приложения). */
    private synchronized void throttle() {
        long wait = MIN_INTERVAL_MS - (System.currentTimeMillis() - lastCallAtMs);
        if (wait > 0) {
            try {
                Thread.sleep(wait);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Запрос прерван");
            }
        }
        lastCallAtMs = System.currentTimeMillis();
    }
}
