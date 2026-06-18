package com.hutka.backend.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class WeatherService {

    private final WebClient.Builder webClientBuilder;

    public String getWeatherForMinsk() {
        try {
            return webClientBuilder.build()
                    .get()
                    .uri("https://api.open-meteo.com/v1/forecast?latitude=53.9&longitude=27.5667&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Minsk")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            return null;
        }
    }

    public String getWeatherWarning(String weatherJson) {
        if (weatherJson == null) return "";

        // Коды погоды Open-Meteo: 61-65 дождь, 71-75 снег, 77 ледяной дождь, 85-86 снегопад
        int[] badCodes = {61, 63, 65, 71, 73, 75, 77, 85, 86};
        for (int code : badCodes) {
            if (weatherJson.contains("\"weathercode\":" + code)) {
                return "Внимание: неблагоприятные погодные условия в Минске. Будьте осторожны на дороге.";
            }
        }

        // Сильный ветер > 50 км/ч
        if (weatherJson.contains("windspeed_10m") && extractWindSpeed(weatherJson) > 50) {
            return "Внимание: сильный ветер в Минске. Будьте осторожны на дороге.";
        }

        return "";
    }

    private double extractWindSpeed(String json) {
        try {
            int idx = json.indexOf("\"windspeed_10m\":") + 16;
            int end = json.indexOf(",", idx);
            if (end == -1) end = json.indexOf("}", idx);
            return Double.parseDouble(json.substring(idx, end).trim());
        } catch (Exception e) {
            return 0;
        }
    }
}
