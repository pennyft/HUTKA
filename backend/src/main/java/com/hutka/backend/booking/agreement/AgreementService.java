package com.hutka.backend.booking.agreement;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.service.PricingService;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 6.6: договор по завершённой брони. Шаги отделены друг от друга и идемпотентны:
 * prepare — сформировать и сохранить PDF (один раз), markSent — отметить отправку. Само письмо уходит между ними,
 * вне транзакции (AgreementDeliveryService), чтобы SMTP не держал блокировку брони.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgreementService {

    /** Данные для письма. */
    public record Delivery(String email, String recipientName, byte[] pdf, String fileName) {}

    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final AgreementPdfRenderer renderer;
    private final AgreementStorage storage;

    /** Часовой пояс для времени в договоре. В ТЗ не задан; валюта BYN указывает на Беларусь (раздел 21). */
    @Value("${app.agreement.timezone:Europe/Minsk}")
    private String timezone;

    /** null — делать нечего (бронь не завершена или договор уже отправлен). */
    @Transactional
    public Delivery prepare(UUID bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.finished || booking.getAgreementSentAt() != null) {
            return null;
        }
        User renter = userRepository.findById(booking.getRenterId())
                .orElseThrow(() -> new IllegalStateException("Арендатор брони " + bookingId + " не найден"));

        byte[] pdf;
        if (booking.getAgreementPdfUrl() == null) {
            pdf = renderAndStore(booking, renter);
        } else {
            try {
                pdf = storage.load(booking.getAgreementPdfUrl());
            } catch (AgreementFileNotFoundException e) {
                // Диск мог быть очищен при передеплое: договор целиком строится из данных брони — формируем заново.
                log.warn("Бронь {}: файл договора утерян, формирую заново", bookingId);
                pdf = renderAndStore(booking, renter);
            }
        }
        return new Delivery(renter.getEmail(), renter.getFirstName(), pdf, "hutka-agreement-" + bookingId + ".pdf");
    }

    @Transactional
    public void markSent(UUID bookingId) {
        bookingRepository.findByIdForUpdate(bookingId).ifPresent(booking -> {
            if (booking.getAgreementSentAt() == null) {
                booking.setAgreementSentAt(Instant.now());
            }
        });
    }

    /** GET /bookings/:id/agreement: договор видят арендатор и партнёр машины; для остальных брони «не существует». */
    @Transactional(readOnly = true)
    public byte[] getPdf(UUID userId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(AgreementService::notFound);
        if (!booking.getRenterId().equals(userId)) {
            Car car = carRepository.findById(booking.getCarId()).orElseThrow(AgreementService::notFound);
            if (!car.getPartnerId().equals(userId)) {
                throw notFound();
            }
        }
        if (booking.getStatus() != BookingStatus.finished || booking.getAgreementPdfUrl() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Договор ещё не сформирован");
        }
        try {
            return storage.load(booking.getAgreementPdfUrl());
        } catch (AgreementFileNotFoundException e) {
            log.warn("Бронь {}: файл договора утерян, формирую заново по запросу", bookingId);
            User renter = userRepository.findById(booking.getRenterId())
                    .orElseThrow(AgreementService::notFound);
            byte[] pdf = render(booking, renter);
            try {
                // транзакция read-only: ключ в БД не обновляем, только восстанавливаем файл
                storage.save(booking.getId(), pdf);
            } catch (RuntimeException saveError) {
                log.warn("Бронь {}: не удалось восстановить файл договора в хранилище: {}", bookingId, saveError.getMessage());
            }
            return pdf;
        }
    }

    // ---------------------------------------------------------------- внутреннее

    /** Формирует PDF по текущим данным брони, не обращаясь к хранилищу. */
    private byte[] render(Booking booking, User renter) {
        Car car = carRepository.findById(booking.getCarId())
                .orElseThrow(() -> new IllegalStateException("Машина брони " + booking.getId() + " не найдена"));
        User partner = userRepository.findById(car.getPartnerId())
                .orElseThrow(() -> new IllegalStateException("Партнёр брони " + booking.getId() + " не найден"));
        String xhtml = AgreementHtmlBuilder.build(toData(booking, renter, partner, car), ZoneId.of(timezone));
        return renderer.render(xhtml);
    }

    /** Формирует PDF, сохраняет в хранилище и записывает ключ в бронь (вызывать внутри транзакции с блокировкой брони). */
    private byte[] renderAndStore(Booking booking, User renter) {
        byte[] pdf = render(booking, renter);
        booking.setAgreementPdfUrl(storage.save(booking.getId(), pdf));
        return pdf;
    }

    private AgreementData toData(Booking b, User renter, User partner, Car car) {
        // Базовая сумма и доплата за просрочку отдельно в брони не хранятся — пересчитываем теми же входными данными
        // (actual_start, actual_end, planned_end, цена на момент брони), что и при завершении.
        PricingService.PriceBreakdown price = pricingService.calculateFinal(
                b.getActualStartAt(), b.getActualEndAt(), b.getPlannedEndAt(), b.getPricePerHour(), b.isPddDiscountApplied());
        if (b.getFinalPrice() != null && price.finalPrice().compareTo(b.getFinalPrice()) != 0) {
            log.warn("Бронь {}: пересчитанная сумма {} не совпала с сохранённой {}; в договоре — сохранённая",
                    b.getId(), price.finalPrice(), b.getFinalPrice());
        }
        return new AgreementData(
                b.getId(), Instant.now(),
                fullName(renter), renter.getEmail(), renter.getPhone(),
                fullName(partner), partner.getEmail(), partner.getPhone(),
                car.getMake(), car.getModel(), car.getYear(), car.getPlateNumber(),
                b.getPlannedStartAt(), b.getPlannedEndAt(), b.getActualStartAt(), b.getActualEndAt(),
                b.getPricePerHour(), price.baseAmount(), price.overdueHours(), price.overdueAmount(),
                b.isPddDiscountApplied(), b.getDiscountAmount(),
                b.getFinalPrice() != null ? b.getFinalPrice() : price.finalPrice(),
                List.copyOf(b.getPhotosBefore()), List.copyOf(b.getPhotosAfter()));
    }

    private static String fullName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Бронирование не найдено");
    }
}
