package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminCarResponse;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.ReasonRequest;
import com.hutka.backend.adminapi.dto.RejectRequest;
import com.hutka.backend.adminapi.service.AdminCarService;
import com.hutka.backend.car.enums.ModerationStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;


@RestController
@RequestMapping("/admin/cars")
@RequiredArgsConstructor
public class AdminCarController {

    private final AdminCarService carService;

    
    @GetMapping
    public AdminPage<AdminCarResponse> list(@RequestParam(required = false) ModerationStatus moderationStatus,
                                            @RequestParam(defaultValue = "false") boolean hiddenByStrikes,
                                            @RequestParam(defaultValue = "false") boolean hiddenByAdmin,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return carService.list(moderationStatus, hiddenByStrikes, hiddenByAdmin, page, size);
    }

    @PostMapping("/{id}/approve")
    public AdminCarResponse approve(@PathVariable UUID id) {
        return carService.approve(id);
    }

    @PostMapping("/{id}/reject")
    public AdminCarResponse reject(@PathVariable UUID id, @Valid @RequestBody RejectRequest body) {
        return carService.reject(id, body.reason());
    }

    /** 16.3: принудительное скрытие — доступно всегда, причина обязательна; партнёр снять скрытие не может. */
    @PostMapping("/{id}/hide")
    public AdminCarResponse hide(@PathVariable UUID id, @Valid @RequestBody ReasonRequest body) {
        return carService.hide(id, body.reason());
    }

    @PostMapping("/{id}/unhide")
    public AdminCarResponse unhide(@PathVariable UUID id) {
        return carService.unhide(id);
    }

    /** 16.3: принудительное удаление — только для машин без завершённых поездок, иначе 409. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        carService.delete(id);
    }

    @PostMapping("/{id}/return-to-catalog")
    public AdminCarResponse returnToCatalog(@PathVariable UUID id) {
        return carService.returnToCatalog(id);
    }
}
