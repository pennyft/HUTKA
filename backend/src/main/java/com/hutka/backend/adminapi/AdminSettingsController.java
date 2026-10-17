package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminSettingsResponse;
import com.hutka.backend.adminapi.dto.UpdateSettingsRequest;
import com.hutka.backend.adminapi.service.AdminSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Раздел 16.9: настройки платформы. */
@RestController
@RequestMapping("/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final AdminSettingsService settingsService;

    @GetMapping
    public AdminSettingsResponse get() {
        return settingsService.get();
    }

    @PatchMapping
    public AdminSettingsResponse update(@AuthenticationPrincipal UUID adminId, @Valid @RequestBody UpdateSettingsRequest body) {
        return settingsService.update(adminId, body);
    }
}
