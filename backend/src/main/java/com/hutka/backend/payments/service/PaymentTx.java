package com.hutka.backend.payments.service;

import com.hutka.backend.payments.Payment;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.PaymentRules;
import com.hutka.backend.payments.enums.PaymentKind;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.payments.gateway.PaymentGateway;
import com.hutka.backend.settings.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Две короткие транзакции списания. Вызов шлюза между ними идёт вне транзакции (PaymentService): не держим соединение
 * с БД, пока ждём внешний сервис. REQUIRES_NEW — потому что списание запускается слушателем после коммита завершения
 * брони, и записи должны фиксироваться в собственной транзакции (как в weather/WeatherJobScheduler).
 */
@Service
@RequiredArgsConstructor
public class PaymentTx {

    /** paymentId — он же ключ идемпотентности для шлюза. */
    public record Started(UUID paymentId, BigDecimal amount) {}

    private final PaymentRepository payments;
    private final PlatformSettingsService settings;

    /**
     * Создаёт запись о списании (pending, попытка 1) с разделением суммы либо берёт существующую неудачную/зависшую для
     * повтора. Уже успешный платёж — null (списывать повторно нельзя). Нарушение UNIQUE (booking_id, kind) при гонке
     * вылетает наружу как DataIntegrityViolationException — PaymentService трактует его как «уже обработано».
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Started begin(PaymentBookingsPort.Settlement s, String provider, String currency) {
        Optional<Payment> existing = payments.findByBookingIdAndKind(s.bookingId(), PaymentKind.trip_charge);
        if (existing.isPresent()) {
            Payment p = existing.get();
            if (p.getStatus() == PaymentStatus.succeeded) {
                return null;
            }
            p.setStatus(PaymentStatus.pending);
            p.setAttempts(p.getAttempts() + 1);
            p.setProvider(provider);
            p.setUpdatedAt(Instant.now());
            return new Started(p.getId(), p.getAmount());
        }
        BigDecimal percent = settings.get().getCommissionPercent();
        PaymentRules.Split split = PaymentRules.split(s.finalPrice(), s.baseAmount(), s.discountAmount(), percent);
        Payment saved = payments.saveAndFlush(Payment.builder()
                .bookingId(s.bookingId())
                .partnerId(s.partnerId())
                .renterId(s.renterId())
                .kind(PaymentKind.trip_charge)
                .status(PaymentStatus.pending)
                .amount(split.amount())
                .commissionPercent(percent)
                .commissionAmount(split.commission())
                .partnerAmount(split.partnerAmount())
                .currency(currency)
                .provider(provider)
                .attempts(1)
                .build());
        return new Started(saved.getId(), saved.getAmount());
    }

    /** Записывает ответ шлюза: succeeded с идентификатором операции либо failed с причиной (повторит sweeper). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void finish(UUID paymentId, PaymentGateway.GatewayResult result) {
        Payment p = payments.findById(paymentId)
                .orElseThrow(() -> new IllegalStateException("Платёж " + paymentId + " не найден"));
        p.setStatus(result.success() ? PaymentStatus.succeeded : PaymentStatus.failed);
        p.setProviderRef(result.providerRef());
        p.setFailureReason(result.success() ? null : abbreviate(result.failureReason()));
        p.setUpdatedAt(Instant.now());
    }

    static String abbreviate(String text) {
        if (text == null) return null;
        return text.length() <= 300 ? text : text.substring(0, 300);
    }
}
