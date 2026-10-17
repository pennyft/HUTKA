package com.hutka.backend.payments.gateway;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Единственная точка, через которую модуль payments «двигает деньги» (15). Реализации выбираются свойством
 * app.payments.provider: fake (по умолчанию, имитация для учебного проекта) или bepaid (заготовка под реальный эквайринг).
 * Остальной код — списание при завершении, недельные выплаты, отчёты — о провайдере ничего не знает, поэтому подключение
 * Bepaid сводится к реализации этого интерфейса (PAYMENTS_DECISIONS.md, «Как подключить настоящий процессинг»).
 *
 * Контракт: отказ по существу (банк не одобрил, недостаточно средств) — это GatewayResult.failure, а не исключение;
 * исключение PaymentGatewayException — сбой связи или конфигурации. Оба случая сервис считает неудачной попыткой и повторит.
 * Идемпотентность: paymentId / payoutId — ключ; повторный вызов с тем же ключом не должен списать или выплатить дважды
 * (так работает fake, этого же нужно требовать от настоящего провайдера).
 */
public interface PaymentGateway {

    /** Имя провайдера — пишется в payments.provider, чтобы в истории было видно, чем проводилась операция. */
    String providerName();

    /** Списать деньги с арендатора за поездку. */
    GatewayResult charge(ChargeRequest request);

    /** Перечислить партнёру выплату. */
    GatewayResult payout(PayoutRequest request);

    /** description — человекочитаемое назначение платежа; amount — в валюте currency (ISO 4217, BYN), два знака. */
    record ChargeRequest(UUID paymentId, UUID bookingId, UUID renterId, BigDecimal amount, String currency,
                         String description) {}

    record PayoutRequest(UUID payoutId, UUID partnerId, BigDecimal amount, String currency, String description) {}

    /** providerRef — идентификатор операции у провайдера (для сверки); failureReason заполнен только при success = false. */
    record GatewayResult(boolean success, String providerRef, String failureReason) {
        public static GatewayResult success(String providerRef) {
            return new GatewayResult(true, providerRef, null);
        }

        public static GatewayResult failure(String reason) {
            return new GatewayResult(false, null, reason);
        }
    }

    /** Сбой связи с провайдером или его настройки. Текст — для лога и поля failure_reason. */
    class PaymentGatewayException extends RuntimeException {
        public PaymentGatewayException(String message) {
            super(message);
        }
    }
}
