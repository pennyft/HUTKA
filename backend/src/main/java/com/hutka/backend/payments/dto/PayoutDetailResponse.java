package com.hutka.backend.payments.dto;

import java.util.List;

/** GET /partner/payouts/:id (10.6, «Детализация»). */
public record PayoutDetailResponse(PayoutResponse payout, List<PayoutItemResponse> items) {}
