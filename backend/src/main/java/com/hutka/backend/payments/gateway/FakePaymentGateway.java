package com.hutka.backend.payments.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Имитация платёжного провайдера для учебного проекта: реальных денег нет, каждая операция просто «проходит» и пишется
 * в лог. Включена по умолчанию (app.payments.provider=fake или свойство не задано).
 *
 * app.payments.fake.mode:
 *   success (по умолчанию) — все операции успешны;
 *   fail — все операции отклоняются: так на защите можно показать неудачное списание, повторы и статус failed.
 *
 * Идентификатор операции детерминирован («fake-» + ключ идемпотентности), поэтому повторный вызов с тем же ключом
 * возвращает тот же результат, как это делает настоящий провайдер.
 */
@Component
@ConditionalOnProperty(name = "app.payments.provider", havingValue = "fake", matchIfMissing = true)
public class FakePaymentGateway implements PaymentGateway {

    private final boolean failing;

    public FakePaymentGateway(@Value("${app.payments.fake.mode:success}") String mode) {
        if (!"success".equals(mode) && !"fail".equals(mode)) {
            throw new IllegalStateException("app.payments.fake.mode = " + mode + ": допустимо success или fail");
        }
        this.failing = "fail".equals(mode);
    }

    @Override
    public String providerName() {
        return "fake";
    }

    @Override
    public GatewayResult charge(ChargeRequest request) {
        if (failing) {
            return GatewayResult.failure("Имитация отказа банка (app.payments.fake.mode=fail)");
        }
        return GatewayResult.success("fake-" + request.paymentId());
    }

    @Override
    public GatewayResult payout(PayoutRequest request) {
        if (failing) {
            return GatewayResult.failure("Имитация отказа при выплате (app.payments.fake.mode=fail)");
        }
        return GatewayResult.success("fake-" + request.payoutId());
    }
}
