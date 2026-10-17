package com.hutka.backend.payments;

import com.hutka.backend.booking.event.BookingFinishedEvent;
import com.hutka.backend.payments.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Связывает завершение поездки со списанием (6.3, 15), не меняя пакет booking: слушает BookingFinishedEvent. Срабатывает
 * ПОСЛЕ коммита завершения: сбой платежа не должен откатывать завершение поездки и освобождение машины — неудачное списание
 * повторит PaymentSweeper. Сейчас списание идёт синхронно в потоке запроса /bookings/:id/finish (шлюз-заглушка отвечает мгновенно);
 * для реального процессинга его нужно вынести в Quartz-задачу, как это сделано для договора (AgreementJob).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentListener {

    private final PaymentService paymentService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onFinished(BookingFinishedEvent event) {
        try {
            paymentService.charge(event.bookingId());
        } catch (RuntimeException e) {
            log.error("Платёж по брони {}: списание не выполнено, повторит sweeper: {}", event.bookingId(), e.getMessage());
        }
    }
}
