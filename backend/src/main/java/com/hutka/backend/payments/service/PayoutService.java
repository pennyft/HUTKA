package com.hutka.backend.payments.service;

import com.hutka.backend.payments.Payout;
import com.hutka.backend.payments.PayoutRepository;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.PaymentRules;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.payments.enums.PayoutStatus;
import com.hutka.backend.payments.gateway.PaymentGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Выплаты партнёрам (10.6, 15: «раз в неделю на карту, за вычетом комиссии»). runWeekly — раз в неделю по cron
 * (PayoutSweeper): каждому партнёру с неоплаченными поступлениями создаётся выплата и отправляется в шлюз.
 * retryPending — повторяет выплаты, которые шлюз не принял. Сам класс не транзакционный: транзакции — в PayoutTx.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutService {

    public enum Outcome { PAID, FAILED, SKIPPED }

    private final PaymentRepository payments;
    private final PayoutRepository payouts;
    private final PayoutTx tx;
    private final PaymentGateway gateway;

    @Value("${app.payments.max-attempts:" + PaymentRules.DEFAULT_MAX_ATTEMPTS + "}")
    private int maxAttempts;

    /** Недельный прогон: все успешные платежи, созданные до сейчас, ещё не включённые в выплату. */
    public void runWeekly() {
        Instant cutoff = Instant.now();
        List<UUID> partners = payments.findPartnersWithUnpaid(PaymentStatus.succeeded, cutoff);
        log.info("Выплаты: партнёров с начислениями — {}", partners.size());
        for (UUID partnerId : partners) {
            try {
                tx.create(partnerId, cutoff).ifPresent(this::execute);
            } catch (RuntimeException e) {
                log.error("Выплата партнёру {} не создана: {}", partnerId, e.getMessage());
            }
        }
    }

    /** Повтор выплат в pending: попытки остались и с последней прошла пауза (PaymentRules.retryDue). */
    public void retryPending() {
        Instant now = Instant.now();
        List<Payout> candidates = payouts.findByStatusAndAttemptsLessThanAndUpdatedAtBefore(PayoutStatus.pending, maxAttempts,
                now.minus(PaymentRules.RETRY_STEP), PageRequest.of(0, 100));
        for (Payout payout : candidates) {
            if (!PaymentRules.retryDue(payout.getAttempts(), maxAttempts, payout.getUpdatedAt(), now)) continue;
            try {
                execute(payout.getId());
            } catch (RuntimeException e) {
                log.error("Выплата {}: повтор не удался: {}", payout.getId(), e.getMessage());
            }
        }
    }

    /** Одна попытка перечисления выплаты. */
    public Outcome execute(UUID payoutId) {
        PaymentGateway.PayoutRequest request = tx.begin(payoutId, "HUTKA: выплата партнёру " + payoutId).orElse(null);
        if (request == null) {
            return Outcome.SKIPPED;
        }
        PaymentGateway.GatewayResult result;
        try {
            result = gateway.payout(request);
        } catch (PaymentGateway.PaymentGatewayException e) {
            result = PaymentGateway.GatewayResult.failure(e.getMessage());
        }
        tx.finish(payoutId, result);
        if (result.success()) {
            log.info("Выплата {}: перечислено {} {} партнёру {} ({})", payoutId, request.amount(), request.currency(),
                    request.partnerId(), gateway.providerName());
            return Outcome.PAID;
        }
        log.warn("Выплата {}: неудача — {}", payoutId, result.failureReason());
        return Outcome.FAILED;
    }
}
