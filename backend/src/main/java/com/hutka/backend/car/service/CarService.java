package com.hutka.backend.car.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.dto.CreateCarRequest;
import com.hutka.backend.car.dto.UpdateCarRequest;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.car.geo.Coordinates;
import com.hutka.backend.car.geo.GeocodingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CarService {

    private static final int MIN_YEAR = 2014;
    private static final int MAX_MILEAGE_KM = 200_000;

    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final GeocodingService geocodingService;
    private final ObjectMapper objectMapper;

    /**
     * Без @Transactional намеренно: геокодинг — сетевой вызов, его нельзя выполнять,
     * удерживая транзакцию и соединение с БД. Сохранение — одна атомарная операция repository.save.
     */
    public UUID create(UUID partnerId, CreateCarRequest request) {
        requireVerified(partnerId);
        validateSubmissionLimits(request.year(), request.mileageKm(), request.inspectionExpiryDate());
        requireValidJson(request.availabilitySchedule(), "availabilitySchedule");

        Coordinates coordinates = geocodingService.geocode(request.address());

        Car car = Car.builder()
                .partnerId(partnerId)
                .make(request.make())
                .model(request.model())
                .year(request.year())
                .plateNumber(request.plateNumber())
                .mileageKm(request.mileageKm())
                .fuelType(request.fuelType())
                .transmission(request.transmission())
                .seats(request.seats())
                .bodyType(request.bodyType())
                .address(request.address())
                .latitude(coordinates.latitude())
                .longitude(coordinates.longitude())
                .pricePerHour(request.pricePerHour())
                .description(request.description())
                .photos(request.photos())
                .techPassportNumber(request.techPassportNumber())
                .insurancePolicyNumber(request.insurancePolicyNumber())
                .inspectionExpiryDate(request.inspectionExpiryDate())
                .availabilitySchedule(request.availabilitySchedule())
                .bookingMode(request.bookingMode())
                .moderationStatus(ModerationStatus.pending)
                .status(CarStatus.available)
                .build();

        return carRepository.save(car).getId();
    }

    /** Раздел 2: заявку на машину подаёт verified-пользователь. */
    private void requireVerified(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (user.getVerificationStatus() != VerificationStatus.verified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Чтобы стать партнёром, подтвердите водительское удостоверение");
        }
    }

    /** Раздел 9.2: форма не даёт отправить заявку, если параметры не проходят фильтр. */
    private void validateSubmissionLimits(int year, int mileageKm, LocalDate inspectionExpiryDate) {
        if (year < MIN_YEAR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Год выпуска должен быть не ранее " + MIN_YEAR);
        }
        if (year > LocalDate.now().getYear() + 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Некорректный год выпуска");
        }
        if (mileageKm > MAX_MILEAGE_KM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Пробег не должен превышать " + MAX_MILEAGE_KM + " км");
        }
        if (inspectionExpiryDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Дата окончания технического осмотра не может быть в прошлом");
        }
    }

    /** Раздел 10.3. Внешние вызовы (геокодинг) выполняются до изменения сущности. */
    public void update(UUID partnerId, UUID carId, UpdateCarRequest request) {
        Car car = getOwnedCar(partnerId, carId);

        requireValidJson(request.availabilitySchedule(), "availabilitySchedule");
        requireValidJson(request.serviceHistory(), "serviceHistory");

        Coordinates newCoordinates = null;
        String newAddress = null;
        if (request.address() != null) {
            newAddress = request.address().trim();
            if (newAddress.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Адрес не может быть пустым");
            }
            if (!newAddress.equals(car.getAddress())) {
                // TODO (раздел 10.3): вернуть 409, если у машины есть брони pending/reserved/in_trip —
                //  добавить проверку, когда появится сущность Booking.
                newCoordinates = geocodingService.geocode(newAddress);
            } else {
                newAddress = null; // адрес не изменился
            }
        }

        if (newCoordinates != null) {
            car.setAddress(newAddress);
            car.setLatitude(newCoordinates.latitude());
            car.setLongitude(newCoordinates.longitude());
        }
        if (request.description() != null) car.setDescription(request.description());
        if (request.pricePerHour() != null) car.setPricePerHour(request.pricePerHour());
        if (request.photos() != null) car.setPhotos(request.photos());
        if (request.availabilitySchedule() != null) car.setAvailabilitySchedule(request.availabilitySchedule());
        if (request.bookingMode() != null) car.setBookingMode(request.bookingMode());
        if (request.serviceHistory() != null) car.setServiceHistory(request.serviceHistory());

        carRepository.save(car);
    }

    /** Раздел 10.2: is_hidden управляется отдельно от status и от модерации. */
    @Transactional
    public void setVisibility(UUID partnerId, UUID carId, boolean hidden) {
        Car car = getOwnedCar(partnerId, carId);
        car.setHidden(hidden);
        carRepository.save(car);
    }

    public List<Car> findByPartner(UUID partnerId) {
        return carRepository.findByPartnerId(partnerId);
    }

    public List<Car> findCatalog() {
        return carRepository.findByModerationStatusAndHiddenFalse(ModerationStatus.approved);
    }

    public List<Car> findMapMarkers() {
        return carRepository
                .findByModerationStatusAndHiddenFalseAndLatitudeIsNotNullAndLongitudeIsNotNull(ModerationStatus.approved);
    }

    /** Публичная карточка: непромодерированные, отклонённые и скрытые машины для всех выглядят как несуществующие. */
    public Car findPublicById(UUID carId) {
        Car car = getCar(carId);
        if (car.getModerationStatus() != ModerationStatus.approved || car.isHidden()) {
            throw carNotFound();
        }
        return car;
    }

    private Car getCar(UUID carId) {
        return carRepository.findById(carId).orElseThrow(CarService::carNotFound);
    }

    /** Чужая машина — 404, а не 403: иначе по коду ответа можно узнать, что такой id существует. */
    private Car getOwnedCar(UUID partnerId, UUID carId) {
        Car car = getCar(carId);
        if (!car.getPartnerId().equals(partnerId)) {
            throw carNotFound();
        }
        return car;
    }

    private void requireValidJson(String json, String fieldName) {
        if (json == null) {
            return;
        }
        try {
            objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Поле " + fieldName + " должно быть корректным JSON");
        }
    }

    private static ResponseStatusException carNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена");
    }
}
