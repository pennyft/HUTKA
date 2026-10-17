package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.CommissionItemResponse;
import com.hutka.backend.adminapi.dto.FinanceSummaryResponse;
import com.hutka.backend.payments.Payment;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.PayoutRepository;
import com.hutka.backend.payments.dto.PayoutResponse;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.payments.enums.PayoutStatus;
import com.hutka.backend.payments.service.PartnerPayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Админские «Финансы» (16.5): расчётные показатели по платежам и выплатам. Экспорт отчётов в ТЗ упомянут, здесь не реализован
 * (PAYMENTS_DECISIONS.md, «Не сделано»). Доступ — только администратор: /admin/** закрыт цепочкой AdminSecurityConfig.
 */
@Service
@RequiredArgsConstructor
public class AdminFinanceService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PaymentRepository payments;
    private final PayoutRepository payouts;

    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;
    @Value("${app.payments.currency:BYN}")
    private String currency;

    @Transactional(readOnly = true)
    public FinanceSummaryResponse summary(Instant from, Instant to) {
        Instant[] range = resolve(from, to);
        PaymentRepository.Totals totals = payments.totals(PaymentStatus.succeeded, range[0], range[1]);
        long failed = payments.countByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(PaymentStatus.failed, range[0], range[1]);
        return new FinanceSummaryResponse(range[0], range[1], currency, totals.getPaymentsCount(), totals.getAmount(),
                totals.getCommission(), totals.getPartnerAmount(), failed,
                payouts.sumByStatus(PayoutStatus.paid),
                payments.accruedBalanceAll(PaymentStatus.succeeded).add(payouts.sumByStatus(PayoutStatus.pending)));
    }

    @Transactional(readOnly = true)
    public AdminPage<CommissionItemResponse> commissions(Instant from, Instant to, int page, int size) {
        Instant[] range = resolve(from, to);
        Page<Payment> result = payments.findByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                PaymentStatus.succeeded, range[0], range[1], pageable(page, size));
        return new AdminPage<>(result.getTotalElements(), result.getContent().stream()
                .map(p -> new CommissionItemResponse(p.getBookingId(), p.getPartnerId(), p.getAmount(),
                        p.getCommissionPercent(), p.getCommissionAmount(), p.getCreatedAt()))
                .toList());
    }

    /** «Расчётная информация по выплатам партнёрам» (16.5): все выплаты, при необходимости — по статусу. */
    @Transactional(readOnly = true)
    public AdminPage<PayoutResponse> payouts(PayoutStatus status, int page, int size) {
        Pageable pageable = pageable(page, size);
        var result = status == null ? payouts.findAllByOrderByCreatedAtDesc(pageable)
                : payouts.findByStatusOrderByCreatedAtDesc(status, pageable);
        return new AdminPage<>(result.getTotalElements(),
                result.getContent().stream().map(PartnerPayoutService::toResponse).toList());
    }

    /** По умолчанию — с начала текущего месяца (по часовому поясу приложения) до сейчас. */
    private Instant[] resolve(Instant from, Instant to) {
        Instant end = to != null ? to : Instant.now();
        Instant start = from != null ? from
                : LocalDate.now(ZoneId.of(timezone)).withDayOfMonth(1).atStartOfDay(ZoneId.of(timezone)).toInstant();
        if (!end.isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "to должно быть позже from");
        }
        return new Instant[]{start, end};
    }

    private static Pageable pageable(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
    }
}
