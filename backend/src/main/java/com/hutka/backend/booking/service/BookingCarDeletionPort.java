package com.hutka.backend.booking.service;

import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.service.CarDeletionPort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.UUID;

/**
 * Раздел 10.2, 16.3. К удалению допускаются машины без завершённых и без активных броней; остаются только отменённые
 * (6.1 no-show, 6.4, 6.5). На них ссылаются внешние ключи без каскада (V3, V5, V6), поэтому перед удалением машины
 * они вычищаются. Ссылки на завершённые брони (платежи V14, оценки V7, споры V10) сюда не попадают — по ним удаление
 * запрещено раньше (hasTripHistory).
 */
@Component
@RequiredArgsConstructor
public class BookingCarDeletionPort implements CarDeletionPort {

    private final BookingRepository bookingRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public boolean hasTripHistory(UUID carId) {
        return bookingRepository.existsByCarIdAndStatusIn(carId, EnumSet.of(BookingStatus.finished));
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void removeCancelledBookings(UUID carId) {
        entityManager.flush();
        // скидка ПДД, возвращённая пользователю после отмены (6.5), хранит ссылку на бронь — отвязываем
        entityManager.createNativeQuery("update pdd_discounts set booking_id = null where booking_id in "
                        + "(select id from bookings where car_id = :carId and status = 'cancelled')")
                .setParameter("carId", carId).executeUpdate();
        // страйки неявки ссылаются и на машину, и на бронь (V5)
        entityManager.createNativeQuery("delete from partner_no_show_strikes where car_id = :carId")
                .setParameter("carId", carId).executeUpdate();
        // фото брони и погодные проверки удаляются каскадом (V3, V13)
        entityManager.createNativeQuery("delete from bookings where car_id = :carId and status = 'cancelled'")
                .setParameter("carId", carId).executeUpdate();
    }
}
