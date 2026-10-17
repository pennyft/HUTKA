package com.hutka.backend.booking.service;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.car.Car;

/**
 * Точка подключения пакета notifications (раздел 13), которого в проекте ещё нет.
 * Вызывается внутри транзакции: настоящая реализация должна отправлять уведомления только после commit.
 */
public interface BookingNotifier {

    /** Бронь создана: уведомить арендатора и партнёра машины. */
    void bookingCreated(Booking booking, Car car);

    /** Статус изменился (подтверждена, отклонена, отменена, начата, завершена). */
    void statusChanged(Booking booking, Car car);

    /** Раздел 6.1: заявка Request to Book автоматически отклонена — партнёр не ответил за 6 часов. */
    void requestExpired(Booking booking, Car car);

    /** Раздел 6.1: бронь автоматически отменена — арендатор не начал поездку (no-show). */
    void renterNoShow(Booking booking, Car car);

    /**
     * Раздел 6.5: бронь автоматически отменена из-за недоступности машины, партнёру начислен страйк.
     * Уведомить арендатора (без последствий для него) и партнёра (страйк; если carHidden — машина скрыта).
     */
    void partnerNoShow(Booking booking, Car car, int strikesInWindow, boolean carHidden);

    /** Раздел 6.3: просрочка возврата эскалирована в «Споры»; машина переведена в under_review. */
    void overdueEscalated(Booking booking, Car car);
}
