package com.hutka.backend.partner;

import com.hutka.backend.car.Car;
import com.hutka.backend.partner.service.PartnerIncomeService;
import com.hutka.backend.car.service.CarService;
import com.hutka.backend.car.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;





@RestController
@RequestMapping("/partner/cars")
@RequiredArgsConstructor
public class PartnerCarController {

    private final CarService carService;
    private final PartnerIncomeService incomeService;
    @GetMapping
    public ResponseEntity<List<PartnerCarResponse>> myCars(@AuthenticationPrincipal UUID partnerId) {
        List<Car> cars = carService.findByPartner(partnerId);
        Map<UUID, BigDecimal> income = incomeService.monthIncomeByCar(cars.stream().map(Car::getId).toList());
        List<PartnerCarResponse> response = cars.stream()
                .map(car -> toPartnerResponse(car, income.getOrDefault(car.getId(), BigDecimal.ZERO)))
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

    /** 10.2, 23.6: удаление без завершённых поездок; при наличии истории — 409, скрытие через /visibility. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UUID partnerId, @PathVariable UUID id) {
        carService.deleteByPartner(partnerId, id);
        return ResponseEntity.noContent().build();
    }

    static PartnerCarResponse toPartnerResponse(Car car, BigDecimal monthIncome) {
        return new PartnerCarResponse(
                car.getId(), car.getMake(), car.getModel(), car.getYear(), car.getPlateNumber(),
                car.getMileageKm(), car.getAddress(), car.getPricePerHour(), car.getPhotos(),
                car.getInspectionExpiryDate(), car.getBookingMode(), car.getModerationStatus(),
                car.getRejectionReason(), car.getStatus(), car.isHidden(), car.isHiddenByStrikes(), car.isHiddenByAdmin(),
                car.getNoShowStrikes(), car.getRatingAvg(), monthIncome
        );
    }
}
