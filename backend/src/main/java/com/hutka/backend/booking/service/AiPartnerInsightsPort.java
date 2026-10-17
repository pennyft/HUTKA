package com.hutka.backend.booking.service;

import com.hutka.backend.ai.service.PartnerInsightsPort;
import com.hutka.backend.booking.AiPartnerStatsRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Реализация порта ai → booking (раздел 11.2). Только завершённые поездки партнёра за период; видит данные исключительно
 * по машинам этого партнёра (раздел 10: «партнёр не видит чужие машины и чужие деньги»). День недели — по началу поездки
 * в часовом поясе Минска. Оборот — сумма final_price до комиссии: комиссия настраивается (16.9) и AI не должен её «угадывать».
 */
@Component
@RequiredArgsConstructor
public class AiPartnerInsightsPort implements PartnerInsightsPort {

    private static final ZoneId MINSK = ZoneId.of("Europe/Minsk");

    private final CarRepository cars;
    private final AiPartnerStatsRepository stats;

    @Override
    @Transactional(readOnly = true)
    public PartnerInsights insightsFor(UUID partnerId, int periodDays) {
        List<Car> partnerCars = cars.findByPartnerId(partnerId);
        Map<DayOfWeek, Long> byWeekday = new EnumMap<>(DayOfWeek.class);
        if (partnerCars.isEmpty()) {
            return new PartnerInsights(periodDays, List.of(), byWeekday);
        }
        Instant since = Instant.now().minus(periodDays, ChronoUnit.DAYS);
        List<AiPartnerStatsRepository.FinishedTrip> trips = stats.findFinishedTrips(
                partnerCars.stream().map(Car::getId).toList(), BookingStatus.finished, since);

        Map<UUID, Long> count = new HashMap<>();
        Map<UUID, BigDecimal> revenue = new HashMap<>();
        for (AiPartnerStatsRepository.FinishedTrip trip : trips) {
            count.merge(trip.getCarId(), 1L, Long::sum);
            if (trip.getFinalPrice() != null) {
                revenue.merge(trip.getCarId(), trip.getFinalPrice(), BigDecimal::add);
            }
            if (trip.getStartedAt() != null) {
                byWeekday.merge(trip.getStartedAt().atZone(MINSK).getDayOfWeek(), 1L, Long::sum);
            }
        }
        List<CarInsight> result = new ArrayList<>();
        for (Car car : partnerCars) {
            result.add(new CarInsight(car.getMake(), car.getModel(), car.getYear(), car.getPricePerHour(),
                    count.getOrDefault(car.getId(), 0L), revenue.getOrDefault(car.getId(), BigDecimal.ZERO), car.getRatingAvg()));
        }
        return new PartnerInsights(periodDays, result, byWeekday);
    }
}
