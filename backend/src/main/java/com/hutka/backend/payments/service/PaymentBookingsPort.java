package com.hutka.backend.payments.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Что платёжному модулю нужно знать о брони. Пакет payments не зависит от booking и car: порт описан здесь,
 * реализация — booking/service/BookingPaymentBookingsPort (тот же приём, что CarBookingsPort и PartnerInsightsPort).
 */
public interface PaymentBookingsPort {

    /**
     * Итог завершённой брони, по которому делится сумма (6.3, 15). baseAmount — цена за часы в пределах планового возврата
     * до скидки; discountAmount — скидка за тест ПДД (0, если не было); finalPrice — итоговая цена (то, что списывается).
     */
    record Settlement(UUID bookingId, UUID renterId, UUID partnerId, BigDecimal baseAmount, BigDecimal discountAmount,
                      BigDecimal finalPrice) {}

    /** Пусто, если брони нет, она не завершена или итоговая цена не больше нуля (списывать нечего). */
    Optional<Settlement> findFinished(UUID bookingId);

    /** Брони, завершённые в [from, to) с итоговой ценой больше нуля, — для sweeper'а (поиск завершённых без платежа). */
    List<UUID> findFinishedIds(Instant from, Instant to);
}
