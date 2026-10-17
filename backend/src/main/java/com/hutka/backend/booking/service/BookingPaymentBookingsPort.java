package com.hutka.backend.booking.service;

import com.hutka.backend.booking.BookingPaymentQueryRepository;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.payments.service.PaymentBookingsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Реализация порта платёжного модуля (15): итог завершённой брони вместе с партнёром-владельцем машины. Живёт в booking —
 * как AiPartnerInsightsPort и BookingCarBookingsPort. Базовую часть цены (до просрочки и скидки) в брони отдельно не хранят,
 * поэтому она пересчитывается тем же PricingService и теми же входными данными, что при завершении (6.3), — результат совпадает.
 */
@Component
@RequiredArgsConstructor
public class BookingPaymentBookingsPort implements PaymentBookingsPort {

    private final BookingRepository bookings;
    private final BookingPaymentQueryRepository paymentQuery;
    private final CarRepository cars;
    private final PricingService pricing;

    @Override
    @Transactional(readOnly = true)
    public Optional<Settlement> findFinished(UUID bookingId) {
        return bookings.findById(bookingId)
                .filter(b -> b.getStatus() == BookingStatus.finished
                        && b.getFinalPrice() != null && b.getFinalPrice().signum() > 0
                        && b.getActualStartAt() != null && b.getActualEndAt() != null)
                .flatMap(b -> cars.findById(b.getCarId()).map(car -> {
                    PricingService.PriceBreakdown price = pricing.calculateFinal(b.getActualStartAt(), b.getActualEndAt(),
                            b.getPlannedEndAt(), b.getPricePerHour(), b.isPddDiscountApplied());
                    BigDecimal discount = b.getDiscountAmount() == null ? BigDecimal.ZERO : b.getDiscountAmount();
                    return new Settlement(b.getId(), b.getRenterId(), car.getPartnerId(), price.baseAmount(), discount,
                            b.getFinalPrice());
                }));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findFinishedIds(Instant from, Instant to) {
        return paymentQuery.findFinishedIds(BookingStatus.finished, from, to);
    }
}
