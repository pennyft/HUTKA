package com.hutka.backend.notifications.service;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.service.BookingNotifier;
import com.hutka.backend.car.Car;
import com.hutka.backend.notifications.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Реализация порта booking → notifications (раздел 13). Заменяет LoggingBookingNotifier (его файл нужно удалить).
 * Вызывается внутри транзакций бронирования; сохранение и отправка — NotificationService.send (отправка только после commit).
 *
 * Получатели. Интерфейс BookingNotifier не передаёт, кто совершил действие, поэтому statusChanged уходит обеим сторонам,
 * включая инициатора (подробнее — docs/NOTIFICATIONS_DECISIONS.md, п. 2).
 */
@Component
@RequiredArgsConstructor
public class NotificationBookingNotifier implements BookingNotifier {

    private final NotificationService notifications;

    /** Раздел 6.1 и 13: арендатору — «бронь создана», партнёру — «новое бронирование». */
    @Override
    public void bookingCreated(Booking booking, Car car) {
        Map<String, Object> payload = base(booking, car);
        payload.put("awaitingPartnerResponse", booking.getConfirmedAt() == null);
        notifications.send(booking.getRenterId(), NotificationType.booking_created, payload);
        notifications.send(car.getPartnerId(), NotificationType.booking_new, payload);
    }

    @Override
    public void statusChanged(Booking booking, Car car) {
        Map<String, Object> payload = base(booking, car);
        payload.put("status", booking.getStatus().name());
        payload.put("confirmed", booking.getConfirmedAt() != null);
        if (booking.getDeclineReason() != null) {
            payload.put("declineReason", booking.getDeclineReason());
        }
        notifications.send(booking.getRenterId(), NotificationType.booking_status_changed, payload);
        notifications.send(car.getPartnerId(), NotificationType.booking_status_changed, payload);
    }

    @Override
    public void requestExpired(Booking booking, Car car) {
        Map<String, Object> payload = base(booking, car);
        notifications.send(booking.getRenterId(), NotificationType.booking_request_expired, payload);
        notifications.send(car.getPartnerId(), NotificationType.booking_request_expired, payload);
    }

    @Override
    public void renterNoShow(Booking booking, Car car) {
        Map<String, Object> payload = base(booking, car);
        notifications.send(booking.getRenterId(), NotificationType.booking_renter_no_show, payload);
        notifications.send(car.getPartnerId(), NotificationType.booking_renter_no_show, payload);
    }

    /** Раздел 6.5: арендатору — отмена без последствий; партнёру — страйк (и скрытие машины, если достигнут порог). */
    @Override
    public void partnerNoShow(Booking booking, Car car, int strikesInWindow, boolean carHidden) {
        notifications.send(booking.getRenterId(), NotificationType.booking_partner_no_show, base(booking, car));
        Map<String, Object> partnerPayload = base(booking, car);
        partnerPayload.put("strikesInWindow", strikesInWindow);
        partnerPayload.put("carHidden", carHidden);
        notifications.send(car.getPartnerId(), NotificationType.booking_partner_strike, partnerPayload);
    }

    @Override
    public void overdueEscalated(Booking booking, Car car) {
        Map<String, Object> payload = base(booking, car);
        notifications.send(booking.getRenterId(), NotificationType.booking_overdue_escalated, payload);
        notifications.send(car.getPartnerId(), NotificationType.booking_overdue_escalated, payload);
    }

    /** Общие поля payload. Новая Map на каждого получателя не нужна: send сразу сериализует её в JSON. Время — ISO-8601 (UTC). */
    private static Map<String, Object> base(Booking booking, Car car) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", booking.getId().toString());
        payload.put("carId", car.getId().toString());
        payload.put("car", car.getMake() + " " + car.getModel());
        payload.put("plannedStartAt", booking.getPlannedStartAt().toString());
        payload.put("plannedEndAt", booking.getPlannedEndAt().toString());
        return payload;
    }
}
