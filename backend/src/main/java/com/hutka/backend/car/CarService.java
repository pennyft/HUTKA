package com.hutka.backend.car;

import com.hutka.backend.car.dto.*;
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

    @Transactional
    public UUID create(UUID partnerId, CreateCarRequest request) {
        validateSubmissionLimits(request.year(), request.mileageKm(), request.inspectionExpiryDate());

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
                .latitude(request.latitude())
                .longitude(request.longitude())
                .pricePerHour(request.pricePerHour())
                .description(request.description())
                .photos(request.photos())
                .techPassportNumber(request.techPassportNumber())
                .insurancePolicyNumber(request.insurancePolicyNumber())
                .inspectionExpiryDate(request.inspectionExpiryDate())
                .availabilitySchedule(request.availabilitySchedule())
                .bookingMode(request.bookingMode())
                .moderationStatus("pending")
                .build();

        Car saved = carRepository.save(car);
        return saved.getId();
    }

    /** Раздел 9.2: форма не даёт отправить заявку, если параметры не проходят фильтр. */
    private void validateSubmissionLimits(int year, int mileageKm, LocalDate inspectionExpiryDate) {
        if (year < MIN_YEAR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Год выпуска должен быть не ранее " + MIN_YEAR);
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


    @Transactional
    public void update(UUID partnerId, UUID carId, UpdateCarRequest request) {
        Car car = getOwnedCar(partnerId, carId);

        if (request.description() != null) car.setDescription(request.description());
        if (request.pricePerHour() != null) car.setPricePerHour(request.pricePerHour());
        if (request.photos() != null) car.setPhotos(request.photos());
        if (request.availabilitySchedule() != null) car.setAvailabilitySchedule(request.availabilitySchedule());
        if (request.bookingMode() != null) car.setBookingMode(request.bookingMode());

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
        return carRepository.findByModerationStatusAndHiddenFalse("approved");
    }

    public List<Car> findMapMarkers() {
        return carRepository.findByModerationStatusAndHiddenFalseAndLatitudeIsNotNullAndLongitudeIsNotNull("approved");
    }

    public Car findById(UUID carId) {
        return carRepository.findById(carId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена"));
    }

    private Car getOwnedCar(UUID partnerId, UUID carId) {
        Car car = findById(carId);
        if (!car.getPartnerId().equals(partnerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это не ваша машина");
        }
        return car;
    }
}
