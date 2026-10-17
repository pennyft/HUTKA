package com.hutka.backend.adminapi.dto;

import com.hutka.backend.disputes.enums.DisputeDecision;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Раздел 16.6: решение по спору — в чью пользу и признанная сумма ущерба.
 * Правила суммы (обязательна при partner_favor, пуста или 0 при renter_favor) — в DisputeRules.
 */
public record ResolveDisputeRequest(
        @NotNull(message = "Укажите решение") DisputeDecision decision,
        BigDecimal damageAmount) {}
