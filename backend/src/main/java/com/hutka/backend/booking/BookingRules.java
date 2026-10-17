package com.hutka.backend.booking;

import java.math.BigDecimal;
import java.time.Duration;

/** Числовые правила раздела 6 в одном месте: сервисы, Quartz-джобы и sweeper берут одни и те же значения. */
public final class BookingRules {

    private BookingRules() {}

    /** Раздел 6.1: для Request to Book planned_start_at не ближе 6 часов от текущего момента. */
    public static final Duration REQUEST_TO_BOOK_MIN_LEAD = Duration.ofHours(6);

    /** Раздел 6.1: партнёр обязан ответить на заявку в течение 6 часов с её создания. */
    public static final Duration REQUEST_TO_BOOK_RESPONSE_TIMEOUT = Duration.ofHours(6);

    /** Разделы 6.1 и 6.5: бронь отменяется, если поездка не начата через 1 час после planned_start_at. */
    public static final Duration NO_SHOW_TIMEOUT = Duration.ofHours(1);

    /** Раздел 6.3: просрочка возврата дольше 3 часов эскалируется в «Споры». */
    public static final Duration OVERDUE_ESCALATION_AFTER = Duration.ofHours(3);

    /** Раздел 6.5: страйки партнёра считаются за последние 30 дней. */
    public static final Duration PARTNER_STRIKE_WINDOW = Duration.ofDays(30);

    /** Раздел 6.5: при 3 страйках за окно машина автоматически скрывается. */
    public static final int PARTNER_STRIKE_HIDE_THRESHOLD = 3;

    /** Раздел 6.3: просроченные часы тарифицируются по цене за час × 1.5. */
    public static final BigDecimal OVERDUE_MULTIPLIER = new BigDecimal("1.5");

    /** Раздел 5.3, 6.3: скидка за тест ПДД — 10% от суммы двух слагаемых до вычета скидки. */
    public static final BigDecimal PDD_DISCOUNT_RATE = new BigDecimal("0.10");

    /** Максимум для колонок NUMERIC(10, 2): сумма больше не поместится в БД (иначе вместо 400 будет ошибка 500). */
    public static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999.99");
}
