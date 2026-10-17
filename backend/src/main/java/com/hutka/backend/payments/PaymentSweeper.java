package com.hutka.backend.payments;

import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.payments.service.PaymentBookingsPort;
import com.hutka.backend.payments.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Страховка списаний (по образцу BookingSweeper): (1) завершённые брони без платежа — слушатель мог не сработать
 * (рестарт, сбой после коммита); (2) неудачные и «зависшие» платежи — повтор с нарастающей паузой, всего
 * app.payments.max-attempts попыток, затем платёж остаётся failed до ручного разбора. Простая периодическая задача —
 * Spring @Scheduled (17.1); @EnableScheduling включён в BookingSchedulingConfig.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentSweeper {

    /** Завершённые брони ищем за последние 3 суток — как в BookingSweeper для договоров. */
    private static final Duration LOOKBACK = Duration.ofDays(3);
    /** Свежие завершения не трогаем: ими занимается слушатель. */
    private static final Duration GRACE = Duration.ofMinutes(2);

    private final PaymentBookingsPort bookings;
    private final PaymentRepository payments;
    private final PaymentService paymentService;

    @Value("${app.payments.max-attempts:" + PaymentRules.DEFAULT_MAX_ATTEMPTS + "}")
    private int maxAttempts;

    @Scheduled(fixedDelayString = "${app.payments.sweep-interval-ms:300000}",
            initialDelayString = "${app.payments.sweep-initial-delay-ms:90000}")
    public void sweep() {
        Instant now = Instant.now();

        List<UUID> finished = bookings.findFinishedIds(now.minus(LOOKBACK), now.minus(GRACE));
        if (!finished.isEmpty()) {
            Set<UUID> charged = new HashSet<>(payments.findBookingIdsIn(finished));
            for (UUID bookingId : finished) {
                if (!charged.contains(bookingId)) {
                    run("завершённая бронь без платежа", bookingId);
                }
            }
        }

        List<Payment> candidates = payments.findByStatusInAndAttemptsLessThanAndUpdatedAtBefore(
                List.of(PaymentStatus.failed, PaymentStatus.pending), maxAttempts,
                now.minus(PaymentRules.RETRY_STEP), PageRequest.of(0, 100));
        for (Payment payment : candidates) {
            if (PaymentRules.retryDue(payment.getAttempts(), maxAttempts, payment.getUpdatedAt(), now)) {
                run("повтор платежа", payment.getBookingId());
            }
        }
    }

    private void run(String what, UUID bookingId) {
        try {
            paymentService.charge(bookingId);
        } catch (RuntimeException e) {
            log.error("Sweeper платежей ({}): бронь {} не обработана: {}", what, bookingId, e.getMessage());
        }
    }
}
