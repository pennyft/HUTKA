package com.hutka.backend.booking.service;

import com.hutka.backend.booking.BookingRules;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;

/**
 * Раздел 6.3. Деньги округляются до 2 знаков (HALF_UP), часы хранятся с точностью до 4 знаков.
 * Режим округления в Hutka.md не указан — выбран HALF_UP как стандартный для денежных сумм.
 */
@Service
public class PricingService {

    private static final BigDecimal SECONDS_PER_HOUR = BigDecimal.valueOf(3600);

    public record PriceBreakdown(
            BigDecimal baseAmount,
            BigDecimal overdueAmount,
            BigDecimal discountAmount,
            BigDecimal finalPrice,
            BigDecimal overdueHours
    ) {}

    /** Предварительная стоимость на этапе создания брони: плановые часы × цена за час. */
    public BigDecimal estimate(Instant plannedStart, Instant plannedEnd, BigDecimal pricePerHour) {
        return amount(plannedStart, plannedEnd, pricePerHour, BigDecimal.ONE);
    }

    /**
     * final_price = (часы в пределах планового возврата × цена) + (просроченные часы × цена × 1.5) − скидка.
     * «Часы в пределах плана» = время от фактического старта до min(фактический конец, плановый конец).
     */
    public PriceBreakdown calculateFinal(Instant actualStart, Instant actualEnd, Instant plannedEnd,
                                         BigDecimal pricePerHour, boolean discountApplies) {
        Instant withinPlanEnd = actualEnd.isBefore(plannedEnd) ? actualEnd : plannedEnd;
        BigDecimal overdueHours = hoursBetween(plannedEnd, actualEnd);

        BigDecimal base = amount(actualStart, withinPlanEnd, pricePerHour, BigDecimal.ONE);
        BigDecimal overdue = amount(plannedEnd, actualEnd, pricePerHour, BookingRules.OVERDUE_MULTIPLIER);

        BigDecimal subtotal = base.add(overdue);
        BigDecimal discount = discountApplies
                ? subtotal.multiply(BookingRules.PDD_DISCOUNT_RATE).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);

        return new PriceBreakdown(base, overdue, discount, subtotal.subtract(discount), overdueHours);
    }

    /**
     * Сумма за интервал: секунды × цена × множитель / 3600 с одним округлением в конце.
     * (Округлять часы до 4 знаков, а потом умножать на цену, давало погрешность до нескольких копеек:
     * 20 минут по 1000 → 333.30 вместо 333.33.)
     */
    private static BigDecimal amount(Instant from, Instant to, BigDecimal pricePerHour, BigDecimal multiplier) {
        if (!to.isAfter(from)) {
            return BigDecimal.ZERO.setScale(2);
        }
        return BigDecimal.valueOf(Duration.between(from, to).toSeconds())
                .multiply(pricePerHour)
                .multiply(multiplier)
                .divide(SECONDS_PER_HOUR, 2, RoundingMode.HALF_UP);
    }

    /** Часы между моментами; если to ≤ from — 0. */
    private static BigDecimal hoursBetween(Instant from, Instant to) {
        if (!to.isAfter(from)) {
            return BigDecimal.ZERO.setScale(4);
        }
        return BigDecimal.valueOf(Duration.between(from, to).toSeconds())
                .divide(SECONDS_PER_HOUR, 4, RoundingMode.HALF_UP);
    }
}
