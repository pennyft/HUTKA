package com.hutka.backend.payments.service;

import com.hutka.backend.payments.Payment;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.PaymentRules;
import com.hutka.backend.payments.Payout;
import com.hutka.backend.payments.PayoutRepository;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.payments.enums.PayoutStatus;
import com.hutka.backend.payments.gateway.PaymentGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Короткие транзакции выплаты; вызов шлюза между ними идёт вне транзакции (PayoutService). */
@Service
@RequiredArgsConstructor
public class PayoutTx {

    private final PaymentRepository payments;
    private final PayoutRepository payouts;

    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;
    @Value("${app.payments.currency:BYN}")
    private String currency;

    /**
     * Собирает выплату партнёру из всех его успешных платежей, созданных до cutoff и ещё не включённых в выплату. Нечего
     * выплачивать — пусто. Включение платежей — одним UPDATE: если хоть один уже забрал параллельный запуск, транзакция
     * откатывается (выплата не создаётся), и деньги не будут выплачены дважды.
     */
    @Transactional
    public Optional<UUID> create(UUID partnerId, Instant cutoff) {
        List<Payment> rows = payments.findByPartnerIdAndStatusAndPayoutIdIsNullAndCreatedAtBeforeOrderByCreatedAt(
                partnerId, PaymentStatus.succeeded, cutoff);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        BigDecimal amount = PaymentRules.sum(rows.stream().map(Payment::getPartnerAmount).toList());
        BigDecimal commission = PaymentRules.sum(rows.stream().map(Payment::getCommissionAmount).toList());
        PaymentRules.Period period = PaymentRules.period(rows.get(0).getCreatedAt(),
                rows.get(rows.size() - 1).getCreatedAt(), ZoneId.of(timezone));

        Payout payout = payouts.saveAndFlush(Payout.builder()
                .partnerId(partnerId)
                .periodStart(period.start())
                .periodEnd(period.end())
                .amount(amount)
                .commissionDeducted(commission)
                .currency(currency)
                .status(PayoutStatus.pending)
                .build());
        UUID payoutId = payout.getId();
        int attached = payments.attachToPayout(rows.stream().map(Payment::getId).toList(), payoutId, Instant.now());
        if (attached != rows.size()) {
            throw new IllegalStateException("Платежи партнёра " + partnerId + " уже включены в другую выплату");
        }
        return Optional.of(payoutId);
    }

    /** Начинает попытку перечисления: pending → запрос к шлюзу (попытка +1). Уже выплаченная — пусто. */
    @Transactional
    public Optional<PaymentGateway.PayoutRequest> begin(UUID payoutId, String description) {
        Payout payout = payouts.findById(payoutId).orElse(null);
        if (payout == null || payout.getStatus() != PayoutStatus.pending) {
            return Optional.empty();
        }
        payout.setAttempts(payout.getAttempts() + 1);
        payout.setUpdatedAt(Instant.now());
        return Optional.of(new PaymentGateway.PayoutRequest(payout.getId(), payout.getPartnerId(), payout.getAmount(),
                payout.getCurrency(), description));
    }

    /** Результат шлюза: paid с датой либо остаётся pending с причиной (повторит PayoutSweeper). */
    @Transactional
    public void finish(UUID payoutId, PaymentGateway.GatewayResult result) {
        Payout payout = payouts.findById(payoutId)
                .orElseThrow(() -> new IllegalStateException("Выплата " + payoutId + " не найдена"));
        Instant now = Instant.now();
        if (result.success()) {
            payout.setStatus(PayoutStatus.paid);
            payout.setPaidAt(now);
            payout.setProviderRef(result.providerRef());
            payout.setFailureReason(null);
        } else {
            payout.setFailureReason(PaymentTx.abbreviate(result.failureReason()));
        }
        payout.setUpdatedAt(now);
    }
}
