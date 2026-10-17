package com.hutka.backend.payments.service;

import com.hutka.backend.payments.gateway.PaymentGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Списание за поездку (6.3, 15: «списывается при завершении поездки»). Порядок: транзакция 1 — запись pending с разделением
 * суммы; вызов шлюза вне транзакции; транзакция 2 — результат. Если процесс упадёт между 1 и 2, запись останется pending, и
 * PaymentSweeper повторит списание с тем же ключом идемпотентности (paymentId) — двойного списания у шлюза не будет.
 * Сам метод не транзакционный. Вызывается слушателем завершения брони и sweeper'ом (повторы).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    public enum Outcome {
        /** Деньги списаны. */
        SUCCEEDED,
        /** Шлюз отказал или недоступен; запись failed, будут повторы. */
        FAILED,
        /** Списывать нечего: брони нет, она не завершена или итоговая цена не больше нуля. */
        SKIPPED,
        /** Платёж по этой брони уже успешен или его создаёт параллельный запуск. */
        ALREADY_HANDLED
    }

    private final PaymentBookingsPort bookings;
    private final PaymentTx tx;
    private final PaymentGateway gateway;

    @Value("${app.payments.currency:BYN}")
    private String currency;

    public Outcome charge(UUID bookingId) {
        PaymentBookingsPort.Settlement settlement = bookings.findFinished(bookingId).orElse(null);
        if (settlement == null) {
            return Outcome.SKIPPED;
        }
        PaymentTx.Started started;
        try {
            started = tx.begin(settlement, gateway.providerName(), currency);
        } catch (DataIntegrityViolationException e) {
            // параллельный запуск успел создать платёж по этой брони (UNIQUE booking_id + kind в V14)
            return Outcome.ALREADY_HANDLED;
        }
        if (started == null) {
            return Outcome.ALREADY_HANDLED;
        }

        PaymentGateway.GatewayResult result;
        try {
            result = gateway.charge(new PaymentGateway.ChargeRequest(started.paymentId(), bookingId, settlement.renterId(),
                    started.amount(), currency, "HUTKA: аренда, бронь " + bookingId));
        } catch (PaymentGateway.PaymentGatewayException e) {
            result = PaymentGateway.GatewayResult.failure(e.getMessage());
        }
        tx.finish(started.paymentId(), result);
        if (result.success()) {
            log.info("Платёж по брони {}: списано {} {} ({})", bookingId, started.amount(), currency, gateway.providerName());
            return Outcome.SUCCEEDED;
        }
        log.warn("Платёж по брони {}: неудача — {}", bookingId, result.failureReason());
        return Outcome.FAILED;
    }
}
