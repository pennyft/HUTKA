package com.hutka.backend.payments.gateway;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * ЗАГОТОВКА под реальный эквайринг Bepaid (15, 17.3). Включается app.payments.provider=bepaid; ничего не делает и на любой
 * вызов отвечает PaymentGatewayException, чтобы случайно не принять заглушку за рабочую интеграцию.
 *
 * Что нужно сделать, чтобы она заработала (подробнее — PAYMENTS_DECISIONS.md):
 * - читать из окружения ключи магазина (app.payments.bepaid.*), не из кода и не из репозитория;
 * - charge: создать платёж у провайдера, передав request.paymentId() как ключ идемпотентности/идентификатор заказа, и вернуть
 *   GatewayResult.success(ref) или GatewayResult.failure(причина отказа);
 * - payout: аналогично для перечисления партнёру на карту (нужны реквизиты из users.payout_bank_details, 10.6);
 * - если провайдер подтверждает платёж асинхронно (вебхук) — добавить вебхук-контроллер, переводящий payments.status pending → succeeded/failed.
 * Конкретные методы и параметры API Bepaid в этом проекте не проверялись — сверяйтесь с документацией провайдера.
 */
@Component
@ConditionalOnProperty(name = "app.payments.provider", havingValue = "bepaid")
public class BepaidPaymentGateway implements PaymentGateway {

    private static final String NOT_IMPLEMENTED = "Интеграция с Bepaid не реализована: см. BepaidPaymentGateway и PAYMENTS_DECISIONS.md";

    @Override
    public String providerName() {
        return "bepaid";
    }

    @Override
    public GatewayResult charge(ChargeRequest request) {
        throw new PaymentGatewayException(NOT_IMPLEMENTED);
    }

    @Override
    public GatewayResult payout(PayoutRequest request) {
        throw new PaymentGatewayException(NOT_IMPLEMENTED);
    }
}
