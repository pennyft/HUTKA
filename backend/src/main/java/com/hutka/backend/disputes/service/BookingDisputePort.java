package com.hutka.backend.disputes.service;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.service.DisputePort;
import com.hutka.backend.car.Car;
import com.hutka.backend.disputes.Dispute;
import com.hutka.backend.disputes.DisputeRepository;
import com.hutka.backend.disputes.enums.DisputeStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Реализация порта booking → disputes (раздел 6.3, 16.6). Заменяет LoggingDisputePort (его файл нужно удалить, иначе
 * в контексте два бина DisputePort). Вызывается из BookingAutomationService.escalateOverdue внутри его транзакции:
 * запись о споре сохраняется атомарно с переводом машины в under_review и отметкой escalated_at.
 * Машина и бронь здесь не меняются — это уже сделал вызывающий код; возврат машины в оборот — при решении (AdminDisputeService).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingDisputePort implements DisputePort {

    private final DisputeRepository disputes;

    @Override
    @Transactional
    public void openOverdueDispute(Booking booking, Car car) {
        // Идемпотентность: повторный вызов (джоб и sweeper) не создаёт второй спор; от гонки страхует uq_disputes_booking
        if (disputes.existsByBookingId(booking.getId())) {
            return;
        }
        disputes.save(Dispute.builder().bookingId(booking.getId()).build());
        log.info("Открыт спор по брони {} (машина {}): просрочка возврата более 3 часов", booking.getId(), car.getId());
    }


    @Override
    @Transactional(readOnly = true)
    public boolean hasOpenDispute(UUID bookingId) {
        return disputes.existsByBookingIdAndStatus(bookingId, DisputeStatus.open);
    }
}
