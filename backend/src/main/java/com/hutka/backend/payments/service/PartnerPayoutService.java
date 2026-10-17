package com.hutka.backend.payments.service;

import com.hutka.backend.payments.Payment;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.Payout;
import com.hutka.backend.payments.PayoutRepository;
import com.hutka.backend.payments.dto.PayoutDetailResponse;
import com.hutka.backend.payments.dto.PayoutItemResponse;
import com.hutka.backend.payments.dto.PayoutListResponse;
import com.hutka.backend.payments.dto.PayoutResponse;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.payments.enums.PayoutStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

/** Кабинет партнёра: баланс, история и детализация выплат (10.6). Чужие данные недоступны — везде фильтр по partnerId. */
@Service
@RequiredArgsConstructor
public class PartnerPayoutService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PayoutRepository payouts;
    private final PaymentRepository payments;

    @Value("${app.payments.payout-cron:0 0 3 * * MON}")
    private String payoutCron;
    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;
    @Value("${app.payments.currency:BYN}")
    private String currency;

    @Transactional(readOnly = true)
    public PayoutListResponse list(UUID partnerId, int page, int size) {
        Page<Payout> result = payouts.findByPartnerIdOrderByCreatedAtDesc(partnerId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE)));
        return new PayoutListResponse(
                payments.accruedBalance(partnerId, PaymentStatus.succeeded),
                payouts.sumByPartnerAndStatus(partnerId, PayoutStatus.pending),
                currency, nextPayoutAt(), result.getTotalElements(),
                result.getContent().stream().map(PartnerPayoutService::toResponse).toList());
    }

    @Transactional(readOnly = true)
    public PayoutDetailResponse get(UUID partnerId, UUID payoutId) {
        Payout payout = payouts.findByIdAndPartnerId(payoutId, partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Выплата не найдена"));
        return new PayoutDetailResponse(toResponse(payout),
                payments.findByPayoutIdOrderByCreatedAt(payoutId).stream().map(PartnerPayoutService::toItem).toList());
    }

    /** Ближайший запуск недельного прогона — по тому же cron, что у PayoutSweeper (один источник правды). */
    Instant nextPayoutAt() {
        ZonedDateTime next = CronExpression.parse(payoutCron).next(ZonedDateTime.now(ZoneId.of(timezone)));
        return next == null ? null : next.toInstant();
    }

    public static PayoutResponse toResponse(Payout p) {
        return new PayoutResponse(p.getId(), p.getPartnerId(), p.getPeriodStart(), p.getPeriodEnd(), p.getAmount(),
                p.getCommissionDeducted(), p.getCurrency(), p.getStatus(), p.getPaidAt(), p.getCreatedAt());
    }

    private static PayoutItemResponse toItem(Payment p) {
        return new PayoutItemResponse(p.getBookingId(), p.getAmount(), p.getCommissionAmount(), p.getPartnerAmount(),
                p.getCreatedAt());
    }
}
