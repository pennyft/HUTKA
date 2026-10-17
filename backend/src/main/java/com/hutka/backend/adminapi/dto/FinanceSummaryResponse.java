package com.hutka.backend.adminapi.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 16.5: показатели за период [from, to) по успешным списаниям. «Всего за всё время» и «сейчас» — срезы, от периода не зависят:
 * paidOutAllTime — перечислено партнёрам; awaitingPayoutNow — начислено партнёрам и ещё не перечислено (баланс + выплаты в pending).
 */
public record FinanceSummaryResponse(Instant from, Instant to, String currency, long paymentsCount, BigDecimal totalCharged,
                                     BigDecimal platformCommission, BigDecimal partnerEarnings, long failedCharges,
                                     BigDecimal paidOutAllTime, BigDecimal awaitingPayoutNow) {}
