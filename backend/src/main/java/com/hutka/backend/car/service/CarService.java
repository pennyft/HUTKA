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
import com.hutka.backend.car.schedule.AvailabilityScheduleParser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
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
    private final TransactionTemplate transactionTemplate;
    private final CarBookingsPort bookingsPort;
    private final CarDeletionPort deletionPort;
    public UUID create(UUID partnerId, CreateCarRequest request) {
        requireVerified(partnerId);
        validateSubmissionLimits(request.year(), request.mileageKm(), request.inspectionExpiryDate());
        requireValidSchedule(request.availabilitySchedule());

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

    
    private void requireVerified(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (user.getVerificationStatus() != VerificationStatus.verified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Чтобы стать партнёром, подтвердите водительское удостоверение");
        }
    }

    
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

    






    public void update(UUID partnerId, UUID carId, UpdateCarRequest request) {
        
        Car snapshot = getOwnedCar(partnerId, carId);

        requireValidSchedule(request.availabilitySchedule());
        requireValidJson(request.serviceHistory(), "serviceHistory");

        Coordinates newCoordinates = null;
        String newAddress = null;
        if (request.address() != null) {
            String trimmed = request.address().trim();
            if (trimmed.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Адрес не может быть пустым");
            }
            if (!trimmed.equals(snapshot.getAddress())) {
                
                
                requireNoActiveBookingsForAddressChange(carId);
                newAddress = trimmed;
                newCoordinates = geocodingService.geocode(trimmed);
            }
        }

        
        final String addressToApply = newAddress;
        final Coordinates coordinatesToApply = newCoordinates;
        transactionTemplate.executeWithoutResult(status ->
                applyUpdate(partnerId, carId, request, addressToApply, coordinatesToApply));
    }

    private void applyUpdate(UUID partnerId, UUID carId, UpdateCarRequest request,
                             String newAddress, Coordinates newCoordinates) {
        Car car = carRepository.findByIdForUpdate(carId).orElseThrow(CarService::carNotFound);
        if (!car.getPartnerId().equals(partnerId)) {
            throw carNotFound();
        }

        if (newCoordinates != null) {
            requireNoActiveBookingsForAddressChange(carId);
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

    




    @Transactional
    public void setVisibility(UUID partnerId, UUID carId, boolean hidden) {
        Car car = getOwnedCar(partnerId, carId);
        if (!hidden && car.isHiddenByAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Машина скрыта администратором. Показать её может только администратор");
        }
        if (!hidden && car.isHiddenByStrikes()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Машина скрыта автоматически из-за неявок. Показать её может только администратор после проверки");
        }
        car.setHidden(hidden);
        carRepository.save(car);
    }

    /**
     * 10.2, 23.6: DELETE /partner/cars/:id. Удалить можно только машину без завершённых поездок; иначе — только скрытие
     * (PATCH /partner/cars/:id/visibility). Строка машины блокируется, поэтому новая бронь не проскочит между проверкой
     * и удалением.
     */
    @Transactional
    public void deleteByPartner(UUID partnerId, UUID carId) {
        Car car = carRepository.findByIdForUpdate(carId).orElseThrow(CarService::carNotFound);
        if (!car.getPartnerId().equals(partnerId)) {
            throw carNotFound();
        }
        deleteLocked(car);
    }

    /** 16.3: принудительное удаление администратором — то же правило, что и для партнёра. Возвращает снимок для уведомления. */
    @Transactional
    public Car deleteByAdmin(UUID carId) {
        Car car = carRepository.findByIdForUpdate(carId).orElseThrow(CarService::carNotFound);
        deleteLocked(car);
        return car;
    }

    private void deleteLocked(Car car) {
        UUID carId = car.getId();
        if (deletionPort.hasTripHistory(carId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "У машины есть завершённые поездки — полное удаление недоступно, машину можно только скрыть");
        }
        if (bookingsPort.hasActiveBookings(carId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Нельзя удалить машину с активными бронированиями");
        }
        deletionPort.removeCancelledBookings(carId);
        carRepository.delete(car);
        carRepository.flush();
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

    
    private Car getOwnedCar(UUID partnerId, UUID carId) {
        Car car = getCar(carId);
        if (!car.getPartnerId().equals(partnerId)) {
            throw carNotFound();
        }
        return car;
    }

    
    private void requireValidSchedule(String json) {
        try {
            AvailabilityScheduleParser.parse(json);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "availabilitySchedule: " + e.getMessage());
        }
    }

    
    private void requireNoActiveBookingsForAddressChange(UUID carId) {
        if (bookingsPort.hasActiveBookings(carId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Нельзя изменить адрес, пока у машины есть активные бронирования");
        }
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
