package com.hutka.backend.favorites.service;

import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.dto.CarResponse;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.car.service.CarService;
import com.hutka.backend.favorites.Favorite;
import com.hutka.backend.favorites.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 2, 23.7. Избранное доступно любому вошедшему пользователю, в том числе unverified (раздел 2): это просмотр списка
 * без бронирования. В список попадают только машины, которые сейчас видны в каталоге (одобрена и не скрыта) — скрытая или
 * отклонённая машина остаётся в таблице, но в ответ не выдаётся и снова появляется, когда её покажут.
 */
@Service
@RequiredArgsConstructor
public class FavoriteService {

    /** Предел списка: защита от разрастания таблицы одним пользователем (в ТЗ лимита нет — значение выбрано здесь). */
    static final int MAX_FAVORITES = 200;

    private final FavoriteRepository favorites;
    private final CarRepository cars;
    private final CarService carService;

    @Transactional(readOnly = true)
    public List<CarResponse> list(UUID userId) {
        List<UUID> ids = favorites.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, MAX_FAVORITES)).stream()
                .map(Favorite::getCarId)
                .toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, Car> byId = cars.findAllById(ids).stream().collect(Collectors.toMap(Car::getId, Function.identity()));
        List<CarResponse> result = new ArrayList<>();
        for (UUID id : ids) {
            Car car = byId.get(id);
            if (car != null && car.getModerationStatus() == ModerationStatus.approved && !car.isHidden()) {
                result.add(toResponse(car));
            }
        }
        return result;
    }

    /** 404, если машина не видна в каталоге (findPublicById); повторное добавление — без ошибки. */
    @Transactional
    public void add(UUID userId, UUID carId) {
        carService.findPublicById(carId);
        if (favorites.countByUserId(userId) >= MAX_FAVORITES) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "В избранном не может быть больше " + MAX_FAVORITES + " машин");
        }
        favorites.addIfAbsent(userId, carId);
    }

    /** Идемпотентно: удаление машины, которой нет в избранном, — не ошибка. */
    @Transactional
    public void remove(UUID userId, UUID carId) {
        favorites.remove(userId, carId);
    }

    /** Тот же состав полей, что в GET /cars (CarController.toResponse); фото копируются, пока открыта транзакция. */
    private static CarResponse toResponse(Car car) {
        return new CarResponse(
                car.getId(), car.getMake(), car.getModel(), car.getYear(), car.getMileageKm(),
                car.getFuelType(), car.getTransmission(), car.getSeats(), car.getBodyType(),
                car.getAddress(), car.getLatitude(), car.getLongitude(), car.getPricePerHour(),
                car.getDescription(), List.copyOf(car.getPhotos()), car.getBookingMode(), car.getStatus(),
                car.getRatingAvg(), null
        );
    }
}
