package com.hutka.backend.weather;

import com.hutka.backend.weather.dto.ForecastResponse;
import com.hutka.backend.weather.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST /weather (23.11). Только HTTP-слой: вся логика — в WeatherService. Эндпоинт требует JWT
 * (anyRequest().authenticated() в SecurityConfig), прогноз нужен залогиненным арендатору и партнёру.
 */
@RestController
@RequestMapping("/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    /**
     * Без параметров — прогноз на ближайшие дни для координат по умолчанию (виджет). latitude/longitude — своя точка,
     * например координаты машины. from/to (ISO 8601 с поясом) — окно поездки: в ответе появится блок window
     * с предупреждениями; если поездка дальше 7 дней, window.available = false.
     */
    @GetMapping("/forecast")
    public ForecastResponse forecast(@RequestParam(required = false) Double latitude,
                                     @RequestParam(required = false) Double longitude,
                                     @RequestParam(required = false) String from,
                                     @RequestParam(required = false) String to) {
        return weatherService.forecast(latitude, longitude, from, to);
    }
}
