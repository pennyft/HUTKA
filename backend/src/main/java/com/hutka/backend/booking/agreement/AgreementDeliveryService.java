package com.hutka.backend.booking.agreement;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Доставка договора: prepare (транзакция) → письмо (без транзакции) → markSent (транзакция).
 * Намеренно без @Transactional: каждый шаг сам открывает транзакцию в AgreementService.
 * Гарантия «хотя бы раз»: если процесс упадёт после отправки, но до markSent, письмо уйдёт повторно.
 */
@Service
@RequiredArgsConstructor
public class AgreementDeliveryService {

    private final AgreementService agreementService;
    private final AgreementMailSender mailSender;

    public void deliver(UUID bookingId) {
        AgreementService.Delivery delivery = agreementService.prepare(bookingId);
        if (delivery == null) {
            return;
        }
        mailSender.send(delivery.email(), delivery.recipientName(), delivery.pdf(), delivery.fileName());
        agreementService.markSent(bookingId);
    }
}
