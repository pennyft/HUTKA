package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminCarRepository;
import com.hutka.backend.adminapi.AdminStrikeRepository;
import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.dto.AdminCarResponse;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.auth.User;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.service.CarService;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;





@Service
@RequiredArgsConstructor
public class AdminCarService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminCarRepository adminCars;
    private final CarRepository cars;
    private final CarService carService;
    private final AdminUserRepository users;
    private final AdminStrikeRepository strikes;
    private final NotificationService notifications;

    



    @Transactional(readOnly = true)
    public AdminPage<AdminCarResponse> list(ModerationStatus status, boolean hiddenByStrikes, boolean hiddenByAdmin,
                                            int page, int size) {
        int pageIndex = Math.max(page, 0);
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        List<Car> items;
        long total;
        if (hiddenByStrikes) {
            Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")));
            items = adminCars.findByHiddenByStrikesTrue(pageable);
            total = adminCars.countByHiddenByStrikesTrue();
        } else if (hiddenByAdmin) {
            Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Order.desc("hiddenByAdminAt"), Sort.Order.asc("id")));
            items = adminCars.findByHiddenByAdminTrue(pageable);
            total = adminCars.countByHiddenByAdminTrue();
        } else {
            ModerationStatus effective = status == null ? ModerationStatus.pending : status;
            Sort sort = effective == ModerationStatus.pending
                    ? Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))
                    : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
            items = adminCars.findByModerationStatus(effective, PageRequest.of(pageIndex, pageSize, sort));
            total = adminCars.countByModerationStatus(effective);
        }
        Map<UUID, User> partners = users.findByIdIn(items.stream().map(Car::getPartnerId).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        return new AdminPage<>(total, items.stream().map(c -> toResponse(c, partners.get(c.getPartnerId()))).toList());
    }

    
    @Transactional
    public AdminCarResponse approve(UUID carId) {
        Car car = lockPending(carId);
        User partner = users.findByIdForUpdate(car.getPartnerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Партнёр не найден"));
        car.setModerationStatus(ModerationStatus.approved);
        car.setRejectionReason(null);
        boolean becamePartner = !partner.isPartner();
        if (becamePartner) {
            partner.setPartner(true);
        }
        Map<String, Object> payload = carPayload(car);
        payload.put("becamePartner", becamePartner);
        notifications.send(partner.getId(), NotificationType.car_approved, payload);
        return toResponse(car, partner);
    }

    @Transactional
    public AdminCarResponse reject(UUID carId, String reason) {
        Car car = lockPending(carId);
        String trimmed = reason.trim();
        car.setModerationStatus(ModerationStatus.rejected);
        car.setRejectionReason(trimmed);
        Map<String, Object> payload = carPayload(car);
        payload.put("reason", trimmed);
        notifications.send(car.getPartnerId(), NotificationType.car_rejected, payload);
        return toResponse(car, users.findByIdIn(List.of(car.getPartnerId())).stream().findFirst().orElse(null));
    }

    




    @Transactional
    public AdminCarResponse returnToCatalog(UUID carId) {
        Car car = cars.findByIdForUpdate(carId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена"));
        if (!car.isHiddenByStrikes()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Машина не скрыта по страйкам неявки");
        }
        strikes.deleteByCarId(car.getId());
        car.setHiddenByStrikes(false);
        // если машину при этом скрыл администратор (hide), она остаётся скрытой до unhide
        car.setHidden(car.isHiddenByAdmin());
        car.setNoShowStrikes(0);
        if (!car.isHidden()) {
            notifications.send(car.getPartnerId(), NotificationType.car_returned_to_catalog, carPayload(car));
        }
        return toResponse(car, users.findByIdIn(List.of(car.getPartnerId())).stream().findFirst().orElse(null));
    }

    /** 16.3: принудительное скрытие — в любом статусе машины и модерации; активные брони остаются в силе (как при скрытии партнёром, 10.2). */
    @Transactional
    public AdminCarResponse hide(UUID carId, String reason) {
        Car car = lockCar(carId);
        if (car.isHiddenByAdmin()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Машина уже скрыта администратором");
        }
        String trimmed = reason.trim();
        car.setHidden(true);
        car.setHiddenByAdmin(true);
        car.setHiddenByAdminReason(trimmed);
        car.setHiddenByAdminAt(Instant.now());
        Map<String, Object> payload = carPayload(car);
        payload.put("reason", trimmed);
        notifications.send(car.getPartnerId(), NotificationType.car_hidden_by_admin, payload);
        return toResponse(car, users.findByIdIn(List.of(car.getPartnerId())).stream().findFirst().orElse(null));
    }

    /** Снимает скрытие администратора; если машина ещё скрыта по страйкам неявки (6.5), она остаётся скрытой. */
    @Transactional
    public AdminCarResponse unhide(UUID carId) {
        Car car = lockCar(carId);
        if (!car.isHiddenByAdmin()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Машина не скрыта администратором");
        }
        car.setHiddenByAdmin(false);
        car.setHiddenByAdminReason(null);
        car.setHiddenByAdminAt(null);
        car.setHidden(car.isHiddenByStrikes());
        Map<String, Object> payload = carPayload(car);
        payload.put("visible", !car.isHidden());
        notifications.send(car.getPartnerId(), NotificationType.car_unhidden_by_admin, payload);
        return toResponse(car, users.findByIdIn(List.of(car.getPartnerId())).stream().findFirst().orElse(null));
    }

    /** 16.3: принудительное удаление — правило и проверки в CarService.deleteByAdmin (только без завершённых поездок). */
    @Transactional
    public void delete(UUID carId) {
        Car car = carService.deleteByAdmin(carId);
        notifications.send(car.getPartnerId(), NotificationType.car_deleted_by_admin, carPayload(car));
    }

    private Car lockCar(UUID carId) {
        return cars.findByIdForUpdate(carId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена"));
    }

    private Car lockPending(UUID carId) {
        Car car = cars.findByIdForUpdate(carId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена"));
        if (car.getModerationStatus() != ModerationStatus.pending) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Заявка уже обработана");
        }
        return car;
    }

    private static Map<String, Object> carPayload(Car car) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("carId", car.getId().toString());
        payload.put("car", car.getMake() + " " + car.getModel());
        return payload;
    }

    private static AdminCarResponse toResponse(Car c, User partner) {
        return new AdminCarResponse(c.getId(), c.getPartnerId(),
                partner == null ? null : partner.getFirstName() + " " + partner.getLastName(),
                partner == null ? null : partner.getEmail(),
                c.getMake(), c.getModel(), c.getYear(), c.getPlateNumber(), c.getMileageKm(), c.getFuelType(),
                c.getTransmission(), c.getSeats(), c.getBodyType(), c.getAddress(), c.getPricePerHour(),
                c.getDescription(), List.copyOf(c.getPhotos()), c.getTechPassportNumber(),
                c.getInsurancePolicyNumber(), c.getInspectionExpiryDate(), c.getBookingMode(),
                c.getModerationStatus(), c.getRejectionReason(), c.getStatus(), c.isHidden(), c.isHiddenByStrikes(),
                c.getNoShowStrikes(), c.getCreatedAt(), c.isHiddenByAdmin(), c.getHiddenByAdminReason());
    }
}
