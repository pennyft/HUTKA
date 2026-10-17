package com.hutka.backend.booking.strike;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.booking.service.SupportTicketPort;
import com.hutka.backend.car.Car;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Раздел 6.5: страйк неявки партнёра и автоскрытие машины при 3 страйках за 30 дней.
 * Вызывается внутри транзакции с уже заблокированной машиной.
 */
@Service
@RequiredArgsConstructor
public class PartnerStrikeService {

    private final PartnerNoShowStrikeRepository strikeRepository;
    private final SupportTicketPort supportTicketPort;

    public record StrikeResult(int strikesInWindow, boolean carHidden) {}

    public StrikeResult record(Booking booking, Car car) {
        if (!strikeRepository.existsByBookingId(booking.getId())) {
            strikeRepository.save(PartnerNoShowStrike.builder()
                    .carId(car.getId())
                    .bookingId(booking.getId())
                    .build());
        }

        Instant windowStart = Instant.now().minus(BookingRules.PARTNER_STRIKE_WINDOW);
        int strikes = (int) strikeRepository.countByCarIdAndCreatedAtAfter(car.getId(), windowStart);
        car.setNoShowStrikes(strikes);

        boolean hiddenNow = false;
        if (strikes >= BookingRules.PARTNER_STRIKE_HIDE_THRESHOLD && !car.isHiddenByStrikes()) {
            // is_hidden — чтобы сработал существующий фильтр каталога и проверка при создании броней;
            // hidden_by_strikes — чтобы партнёр не мог сам снова показать машину (см. CarService.setVisibility).
            car.setHidden(true);
            car.setHiddenByStrikes(true);
            hiddenNow = true;
            supportTicketPort.createUrgentTicketForAdmin(
                    "Автоскрытие машины: " + strikes + " неявки партнёра за 30 дней",
                    "Машина " + car.getId() + " (партнёр " + car.getPartnerId() + ") скрыта из каталога до ручной проверки.");
        }
        return new StrikeResult(strikes, hiddenNow);
    }
}
