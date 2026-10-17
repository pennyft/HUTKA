package com.hutka.backend.disputes;

import com.hutka.backend.disputes.enums.DisputeDecision;

import java.math.BigDecimal;

/**
 * Раздел 16.6: правила решения по спору без Spring и БД (проверяются отдельным тестом).
 *
 *  - в пользу арендатора: ущерб не признаётся — сумма должна быть пустой или нулевой, сохраняется 0.00;
 *  - в пользу партнёра: признанную сумму ущерба нужно указать явно (0.00 допустимо — например, если партнёр прав
 *    по существу, но ущерба нет); не отрицательная, не больше 2 знаков после запятой, не больше 99 999 999.99
 *    (предел колонки NUMERIC(10,2)).
 */
public final class DisputeRules {

    static final BigDecimal MAX_DAMAGE = new BigDecimal("99999999.99");

    private DisputeRules() {}

    /** @return сумма ущерба для сохранения, всегда со scale = 2 */
    public static BigDecimal normalizeDamage(DisputeDecision decision, BigDecimal damageAmount) {
        if (decision == null) {
            throw new IllegalArgumentException("Укажите решение: renter_favor или partner_favor");
        }
        if (decision == DisputeDecision.renter_favor) {
            if (damageAmount != null && damageAmount.signum() != 0) {
                throw new IllegalArgumentException("При решении в пользу арендатора сумма ущерба должна быть пустой или нулевой");
            }
            return new BigDecimal("0.00");
        }
        if (damageAmount == null) {
            throw new IllegalArgumentException("Укажите признанную сумму ущерба");
        }
        if (damageAmount.signum() < 0) {
            throw new IllegalArgumentException("Сумма ущерба не может быть отрицательной");
        }
        if (damageAmount.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("Сумма ущерба — не более двух знаков после запятой");
        }
        if (damageAmount.compareTo(MAX_DAMAGE) > 0) {
            throw new IllegalArgumentException("Сумма ущерба слишком велика");
        }
        return damageAmount.setScale(2);
    }
}
