package com.hutka.backend.booking.agreement;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Всё, что попадает в договор (раздел 6.6). Простой набор значений — собирается в AgreementService, рендерится в AgreementHtmlBuilder. */
public record AgreementData(
        UUID bookingId,
        Instant generatedAt,
        // стороны
        String renterName, String renterEmail, String renterPhone,
        String partnerName, String partnerEmail, String partnerPhone,
        // автомобиль
        String carMake, String carModel, Integer carYear, String carPlate,
        // период
        Instant plannedStart, Instant plannedEnd, Instant actualStart, Instant actualEnd,
        // стоимость (BYN)
        BigDecimal pricePerHour, BigDecimal baseAmount, BigDecimal overdueHours, BigDecimal overdueAmount,
        boolean discountApplied, BigDecimal discountAmount, BigDecimal finalPrice,
        // приложение: ссылки на фото
        List<String> photosBefore, List<String> photosAfter
) {}
