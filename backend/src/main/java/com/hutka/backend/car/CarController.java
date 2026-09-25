package com.hutka.backend.car;

import com.hutka.backend.car.dto.CarMapMarkerResponse;
import com.hutka.backend.car.dto.CarResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/cars")
@RequiredArgsConstructor
public class CarController {

    private final CarService carService;

    @GetMapping
    public ResponseEntity<List<CarResponse>> catalog() {
        List<CarResponse> response = carService.findCatalog().stream()
                .map(CarController::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarResponse> details(@PathVariable UUID id) {
        return ResponseEntity.ok(toResponse(carService.findById(id)));
    }

    @GetMapping("/map")
    public ResponseEntity<List<CarMapMarkerResponse>> mapMarkers() {
        List<CarMapMarkerResponse> response = carService.findMapMarkers().stream()
                .map(car -> new CarMapMarkerResponse(
                        car.getId(), car.getLatitude(), car.getLongitude(),
                        car.getPricePerHour(), car.getStatus()))
                .toList();
        return ResponseEntity.ok(response);
    }

    static CarResponse toResponse(Car car) {
        return new CarResponse(
                car.getId(), car.getMake(), car.getModel(), car.getYear(), car.getMileageKm(),
                car.getFuelType(), car.getTransmission(), car.getSeats(), car.getBodyType(),
                car.getAddress(), car.getLatitude(), car.getLongitude(), car.getPricePerHour(),
                car.getDescription(), car.getPhotos(), car.getBookingMode(), car.getStatus(),
                car.getRatingAvg()
        );
    }
}
