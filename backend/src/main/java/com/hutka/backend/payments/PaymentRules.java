package com.hutka.backend.payments;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;

/**
 * Чистая денежная логика (раздел 15) без БД и сети: разделение суммы поездки между платформой и партнёром,
 * суммирование для выплаты, период выплаты, расписание повторов. Все суммы — в одной валюте (BYN), два знака.
 */
public final class PaymentRules {

    /** Сколько всего попыток (первая + повторы) делается для одного списания или выплаты; потом — только вручную. */
    public static final int DEFAULT_MAX_ATTEMPTS = 3;
    /** Пауза перед повтором растёт линейно: после 1-й неудачи 5 минут, после 2-й 10 минут. */
    public static final Duration RETRY_STEP = Duration.ofMinutes(5);

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private PaymentRules() {}

    /** amount — списано с арендатора; commission — удержано платформой; partnerAmount — причитается партнёру. amount = commission + partnerAmount. */
    public record Split(BigDecimal amount, BigDecimal commission, BigDecimal partnerAmount) {}

    /** Календарные даты (включительно) первого и последнего платежа в выплате — поля period_start / period_end (21.4). */
    public record Period(LocalDate start, LocalDate end) {}

    /**
     * Раздел 15: комиссия удерживается только с суммы «часы в пределах плана × цена»; просроченные часы (× 1.5) идут партнёру
     * целиком. Скидка за тест ПДД (6.3) вычитается из итога; в ТЗ не сказано, чьими деньгами она оплачена, принято:
     * скидка уменьшает облагаемую комиссией часть (PAYMENTS_DECISIONS.md, п. 4). Итог списания всегда равен finalPrice брони.
     *
     * @param finalPrice  итоговая цена брони (bookings.final_price), больше нуля
     * @param baseAmount  часть цены за часы в пределах планового возврата, до скидки
     * @param discountAmount скидка за тест ПДД (может быть null — скидки не было)
     * @param commissionPercent commission_percent из platform_settings, 0–100
     */
    public static Split split(BigDecimal finalPrice, BigDecimal baseAmount, BigDecimal discountAmount,
                              BigDecimal commissionPercent) {
        if (finalPrice == null || finalPrice.signum() <= 0) {
            throw new IllegalArgumentException("Сумма списания должна быть больше нуля");
        }
        if (baseAmount == null || baseAmount.signum() < 0) {
            throw new IllegalArgumentException("Базовая часть цены не может быть отрицательной");
        }
        BigDecimal discount = discountAmount == null ? BigDecimal.ZERO : discountAmount;
        if (discount.signum() < 0) {
            throw new IllegalArgumentException("Скидка не может быть отрицательной");
        }
        if (commissionPercent == null || commissionPercent.signum() < 0 || commissionPercent.compareTo(HUNDRED) > 0) {
            throw new IllegalArgumentException("Комиссия должна быть от 0 до 100 процентов");
        }
        BigDecimal amount = finalPrice.setScale(2, RoundingMode.HALF_UP);
        BigDecimal commissionBase = baseAmount.subtract(discount).max(BigDecimal.ZERO);
        BigDecimal commission = commissionBase.multiply(commissionPercent)
                .divide(HUNDRED, 2, RoundingMode.HALF_UP)
                .min(amount)
                .setScale(2, RoundingMode.HALF_UP);
        return new Split(amount, commission, amount.subtract(commission));
    }

    /** Сумма значений с точностью до копейки; пустой набор — 0.00. */
    public static BigDecimal sum(Collection<BigDecimal> values) {
        BigDecimal total = BigDecimal.ZERO.setScale(2);
        for (BigDecimal value : values) {
            total = total.add(value);
        }
        return total;
    }

    /** Период выплаты по датам (в часовом поясе приложения) самого раннего и самого позднего платежа. */
    public static Period period(Instant first, Instant last, ZoneId zone) {
        return new Period(LocalDate.ofInstant(first, zone), LocalDate.ofInstant(last, zone));
    }

    /**
     * Пора ли повторить операцию: попытки ещё остались и с последней прошла пауза (RETRY_STEP × число уже сделанных попыток).
     * attempts — сколько попыток уже сделано (у только что созданной записи 0 и 1 ведут себя одинаково).
     */
    public static boolean retryDue(int attempts, int maxAttempts, Instant lastAttemptAt, Instant now) {
        if (attempts >= maxAttempts) return false;
        Instant notBefore = lastAttemptAt.plus(RETRY_STEP.multipliedBy(Math.max(attempts, 1)));
        return !now.isBefore(notBefore);
    }
}
