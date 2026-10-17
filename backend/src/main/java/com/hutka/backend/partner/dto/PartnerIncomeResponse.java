package com.hutka.backend.partner.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 10.5: «Доход за месяц» с детализацией — список поездок, вошедших в расчёт, с суммой по каждой.
 * partnerAmount — то, что получает партнёр (за вычетом комиссии платформы, раздел 15); chargedAmount — списано с арендатора.
 */
public record PartnerIncomeResponse(
        String month,
        String currency,
        BigDecimal total,
        BigDecimal commissionTotal,
        long tripsCount,
        List<Trip> trips) {

    public record Trip(UUID bookingId, UUID carId, String car, Instant finishedAt, BigDecimal chargedAmount,
                       BigDecimal commissionAmount, BigDecimal partnerAmount) {}
}
