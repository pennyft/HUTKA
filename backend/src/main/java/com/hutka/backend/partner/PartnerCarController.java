package com.hutka.backend.partner;

import com.hutka.backend.car.Car;
import com.hutka.backend.car.service.CarService;
import com.hutka.backend.car.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 23.4: кабинет партнёра. Подача заявки на машину доступна verified-пользователю
 * (раздел 2); проверка выполняется в CarService.create.
 */
@RestController
@RequestMapping("/partner/cars")
@RequiredArgsConstructor
public class PartnerCarController {

    private final CarService carService;

    @GetMapping
    public ResponseEntity<List<PartnerCarResponse>> myCars(@AuthenticationPrincipal UUID partnerId) {
        List<PartnerCarResponse> response = carService.findByPartner(partnerId).stream()
                .map(PartnerCarController::toPartnerResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Void> register(@AuthenticationPrincipal UUID partnerId,
                                         @Valid @RequestBody CreateCarRequest request) {
        UUID carId = carService.create(partnerId, request);
        return ResponseEntity.created(URI.create("/partner/cars/" + carId)).build();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Void> update(@AuthenticationPrincipal UUID partnerId,
                                       @PathVariable UUID id,
                                       @Valid @RequestBody UpdateCarRequest request) {
        carService.update(partnerId, id, request);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<Void> setVisibility(@AuthenticationPrincipal UUID partnerId,
                                              @PathVariable UUID id,
                                              @Valid @RequestBody VisibilityRequest request) {
        carService.setVisibility(partnerId, id, request.hidden());
        return ResponseEntity.ok().build();
    }

    static PartnerCarResponse toPartnerResponse(Car car) {
        return new PartnerCarResponse(
                car.getId(), car.getMake(), car.getModel(), car.getYear(), car.getPlateNumber(),
                car.getMileageKm(), car.getAddress(), car.getPricePerHour(), car.getPhotos(),
                car.getInspectionExpiryDate(), car.getBookingMode(), car.getModerationStatus(),
                car.getRejectionReason(), car.getStatus(), car.isHidden(), car.getNoShowStrikes(),
                car.getRatingAvg()
        );
    }
}
