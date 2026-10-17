package com.hutka.backend.weather;

import com.hutka.backend.weather.enums.WeatherCheckKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WeatherCheckRepository extends JpaRepository<WeatherCheck, UUID> {

    boolean existsByBookingIdAndKind(UUID bookingId, WeatherCheckKind kind);
}
