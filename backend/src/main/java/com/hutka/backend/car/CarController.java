package com.hutka.backend.car;

import com.hutka.backend.car.dto.CarMapResponse;
import com.hutka.backend.car.dto.CarRequest;
import com.hutka.backend.car.dto.CarResponse;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cars")
@RequiredArgsConstructor
public class CarController {

    private final CarService carService;

    // ───── ПАРТНЁР ─────

    @PostMapping
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<CarResponse> addCar(
            @RequestBody CarRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(carService.addCar(request, user.getId()));
    }

    @PutMapping("/{carId}")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<CarResponse> updateCarByPartner(
            @PathVariable UUID carId,
            @RequestBody CarRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(carService.updateCarByPartner(carId, request, user.getId()));
    }

    @DeleteMapping("/{carId}")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<Void> deleteCarByPartner(
            @PathVariable UUID carId,
            @AuthenticationPrincipal User user) {
        carService.deleteCarByPartner(carId, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ───── ОБЩИЕ ─────

    @GetMapping("/{carId}")
    public ResponseEntity<CarResponse> getCarById(@PathVariable UUID carId) {
        return ResponseEntity.ok(carService.getCarById(carId));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<List<CarResponse>> getMyCars(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(carService.getCarsByOwner(user.getId()));
    }

    @GetMapping("/map")
    public ResponseEntity<List<CarMapResponse>> getCarsForMap() {
        return ResponseEntity.ok(carService.getActiveCarsForMap());
    }

    // ───── МОДЕРАТОР ─────

    @PatchMapping("/admin/{carId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CarResponse> updateCarStatus(
            @PathVariable UUID carId,
            @RequestParam CarStatus status,
            @RequestParam(required = false) String comment) {
        return ResponseEntity.ok(carService.updateCarStatus(carId, status, comment));
    }

    @PutMapping("/admin/{carId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CarResponse> updateCarByModerator(
            @PathVariable UUID carId,
            @RequestBody CarRequest request) {
        return ResponseEntity.ok(carService.updateCarByModerator(carId, request));
    }

    @DeleteMapping("/admin/{carId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCarByModerator(@PathVariable UUID carId) {
        carService.deleteCarByModerator(carId);
        return ResponseEntity.noContent().build();
    }
}
