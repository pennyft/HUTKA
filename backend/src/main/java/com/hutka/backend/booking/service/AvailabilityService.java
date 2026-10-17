package com.hutka.backend.booking.service;

import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.car.schedule.AvailabilityScheduleParser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Set;

/** Раздел 6.1: можно ли создать бронь на этот интервал. Вызывать при уже заблокированной строке машины. */
@Service
@RequiredArgsConstructor
public class AvailabilityService {

    /** Раздел 6.1: пересечение проверяется с бронями в статусах pending и active. */
    private static final Set<BookingStatus> BLOCKING_STATUSES = EnumSet.of(BookingStatus.pending, BookingStatus.active);

    private final BookingRepository bookingRepository;

    /** Часовой пояс платформы: в нём заданы часы расписания доступности (раздел 9.1). */
    @Value("${app.booking.timezone:${app.agreement.timezone:Europe/Minsk}}")
    private String timezone;

    public void assertCanBook(Car car, Instant start, Instant end, Instant now) {
        if (!end.isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Время окончания должно быть позже времени начала");
        }
        if (start.isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Время начала не может быть в прошлом");
        }
        if (car.getBookingMode() == BookingMode.request_to_book
                && start.isBefore(now.plus(BookingRules.REQUEST_TO_BOOK_MIN_LEAD))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Для заявки (Request to Book) начало аренды должно быть не ближе 6 часов от текущего момента");
        }

        // Непромодерированная/отклонённая машина для арендатора не существует (как в CarService.findPublicById)
        if (car.getModerationStatus() != ModerationStatus.approved) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена");
        }
        // Раздел 22.2: скрытая машина недоступна для новых броней; under_review — изъята из оборота
        if (car.isHidden() || car.getStatus() == CarStatus.under_review) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Машина недоступна для бронирования");
        }

        // Раздел 9.1: расписание доступности по дням и часам; формат и правила — car.schedule.AvailabilitySchedule
        boolean withinSchedule = AvailabilityScheduleParser.parseLenient(car.getAvailabilitySchedule())
                .map(schedule -> schedule.covers(start, end, ZoneId.of(timezone)))
                .orElse(true);
        if (!withinSchedule) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Выбранное время вне расписания доступности машины");
        }

        if (bookingRepository.existsOverlapping(car.getId(), BLOCKING_STATUSES, start, end)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Выбранное время уже занято");
        }
    }
}
