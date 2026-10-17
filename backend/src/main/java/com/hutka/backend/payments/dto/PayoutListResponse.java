package com.hutka.backend.payments.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * GET /partner/payouts (10.6). balance — начислено, но ещё не включено в выплату («текущий баланс до следующей выплаты»);
 * pendingAmount — уже включено в выплаты, которые ещё не перечислены; nextPayoutAt — когда следующий прогон выплат.
 * Историю выплат отдаёт items (новые первыми), total — их общее число.
 */
public record PayoutListResponse(BigDecimal balance, BigDecimal pendingAmount, String currency, Instant nextPayoutAt,
                                 long total, List<PayoutResponse> items) {}
