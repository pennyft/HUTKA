package com.hutka.backend.ai.service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Точка подключения ai → booking (раздел 11.2: рекомендации по цене и дням на основе истории аренд). Реализация — booking.AiPartnerInsightsPort. */
public interface PartnerInsightsPort {

    /**
     * @param finishedTrips число завершённых поездок за период
     * @param revenue       сумма final_price завершённых поездок в BYN, ДО вычета комиссии платформы
     */
    record CarInsight(String make, String model, Integer year, BigDecimal pricePerHour,
                      long finishedTrips, BigDecimal revenue, BigDecimal ratingAvg) {}

    record PartnerInsights(int periodDays, List<CarInsight> cars, Map<DayOfWeek, Long> tripsByWeekday) {}

    PartnerInsights insightsFor(UUID partnerId, int periodDays);
}
