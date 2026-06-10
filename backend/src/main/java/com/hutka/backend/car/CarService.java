package com.hutka.backend.car;

import com.hutka.backend.car.dto.CarMapResponse;
import com.hutka.backend.car.dto.CarRequest;
import com.hutka.backend.car.dto.CarResponse;
import com.hutka.backend.car.entity.Car;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.repository.CarRepository;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CarService {

    private final CarRepository carRepository;
    private final UserService userService;

    // ───── ПАРТНЁР ─────

    public CarResponse addCar(CarRequest request, UUID ownerId) {
        User owner = userService.findById(ownerId);

        Car car = Car.builder()
                .owner(owner)
                .brand(request.getBrand())
                .model(request.getModel())
                .year(request.getYear())
                .mileage(request.getMileage())
                .fuelType(request.getFuelType())
                .transmission(request.getTransmission())
                .seats(request.getSeats())
                .bodyType(request.getBodyType())
                .pricePerHour(request.getPricePerHour())
                .description(request.getDescription())
                .bookingMode(request.getBookingMode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .status(CarStatus.PENDING_MODERATION)
                .build();

        carRepository.save(car);
        return toCarResponse(car);
    }

    public CarResponse updateCarByPartner(UUID carId, CarRequest request, UUID ownerId) {
        Car car = getCarOrThrow(carId);

        if (!car.getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Access denied");
        }

        applyCarRequest(car, request);
        car.setStatus(CarStatus.PENDING_MODERATION);

        carRepository.save(car);
        return toCarResponse(car);
    }

    public void deleteCarByPartner(UUID carId, UUID ownerId) {
        Car car = getCarOrThrow(carId);

        if (!car.getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Access denied");
        }

        carRepository.delete(car);
    }

    // ───── ОБЩИЕ ─────

    public CarResponse getCarById(UUID carId) {
        return toCarResponse(getCarOrThrow(carId));
    }

    public List<CarResponse> getCarsByOwner(UUID ownerId) {
        return carRepository.findByOwnerId(ownerId)
                .stream()
                .map(this::toCarResponse)
                .toList();
    }

    public List<CarMapResponse> getActiveCarsForMap() {
        return carRepository.findByStatus(CarStatus.ACTIVE)
                .stream()
                .map(this::toCarMapResponse)
                .toList();
    }

    // ───── МОДЕРАТОР ─────

    public CarResponse updateCarStatus(UUID carId, CarStatus status, String comment) {
        Car car = getCarOrThrow(carId);
        car.setStatus(status);
        car.setModerationComment(comment);
        carRepository.save(car);
        return toCarResponse(car);
    }

    public CarResponse updateCarByModerator(UUID carId, CarRequest request) {
        Car car = getCarOrThrow(carId);
        applyCarRequest(car, request);
        carRepository.save(car);
        return toCarResponse(car);
    }

    public void deleteCarByModerator(UUID carId) {
        carRepository.delete(getCarOrThrow(carId));
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private Car getCarOrThrow(UUID carId) {
        return carRepository.findById(carId)
                .orElseThrow(() -> new RuntimeException("Car not found"));
    }

    private void applyCarRequest(Car car, CarRequest request) {
        car.setBrand(request.getBrand());
        car.setModel(request.getModel());
        car.setYear(request.getYear());
        car.setMileage(request.getMileage());
        car.setFuelType(request.getFuelType());
        car.setTransmission(request.getTransmission());
        car.setSeats(request.getSeats());
        car.setBodyType(request.getBodyType());
        car.setPricePerHour(request.getPricePerHour());
        car.setDescription(request.getDescription());
        car.setBookingMode(request.getBookingMode());
        car.setLatitude(request.getLatitude());
        car.setLongitude(request.getLongitude());
    }

    private CarResponse toCarResponse(Car car) {
        CarResponse response = new CarResponse();
        response.setId(car.getId());
        response.setOwnerId(car.getOwner().getId());
        response.setBrand(car.getBrand());
        response.setModel(car.getModel());
        response.setYear(car.getYear());
        response.setMileage(car.getMileage());
        response.setFuelType(car.getFuelType());
        response.setTransmission(car.getTransmission());
        response.setSeats(car.getSeats());
        response.setBodyType(car.getBodyType());
        response.setPricePerHour(car.getPricePerHour());
        response.setDescription(car.getDescription());
        response.setStatus(car.getStatus());
        response.setBookingMode(car.getBookingMode());
        response.setLatitude(car.getLatitude());
        response.setLongitude(car.getLongitude());
        response.setRating(car.getRating());
        response.setPhotoUrls(
                car.getPhotos().stream().map(p -> p.getUrl()).toList()
        );
        return response;
    }

    private CarMapResponse toCarMapResponse(Car car) {
        CarMapResponse response = new CarMapResponse();
        response.setId(car.getId());
        response.setBrand(car.getBrand());
        response.setModel(car.getModel());
        response.setPricePerHour(car.getPricePerHour());
        response.setLatitude(car.getLatitude());
        response.setLongitude(car.getLongitude());
        response.setStatus(car.getStatus());
        response.setMainPhotoUrl(
                car.getPhotos().isEmpty() ? null : car.getPhotos().get(0).getUrl()
        );
        return response;
    }
}
