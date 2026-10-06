package com.hutka.backend.car.geo;

public interface GeocodingService {

    /**
     * Раздел 4.2: координаты вычисляются один раз при сохранении адреса.
     *
     * @throws org.springframework.web.server.ResponseStatusException 400 — адрес не найден, 503 — геокодер недоступен
     */
    Coordinates geocode(String address);
}
