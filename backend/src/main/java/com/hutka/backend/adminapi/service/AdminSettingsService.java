package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.dto.AdminSettingsResponse;
import com.hutka.backend.adminapi.dto.UpdateSettingsRequest;
import com.hutka.backend.settings.PlatformSettings;
import com.hutka.backend.settings.PlatformSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/** Раздел 16.9: параметры комиссии и пороговые значения. Города («на будущее») и лимиты в модели настроек пока отсутствуют. */
@Service
@RequiredArgsConstructor
public class AdminSettingsService {

    private final PlatformSettingsRepository repository;

    @Transactional(readOnly = true)
    public AdminSettingsResponse get() {
        return toResponse(load());
    }

    @Transactional
    public AdminSettingsResponse update(UUID adminId, UpdateSettingsRequest request) {
        if (request.commissionPercent() == null && request.minRatingThreshold() == null
                && request.minRatingsCount() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Не передано ни одного параметра");
        }
        PlatformSettings settings = load();
        if (request.commissionPercent() != null) {
            settings.setCommissionPercent(request.commissionPercent().setScale(2, RoundingMode.HALF_UP));
        }
        if (request.minRatingThreshold() != null) {
            settings.setMinRatingThreshold(request.minRatingThreshold().setScale(2, RoundingMode.HALF_UP));
        }
        if (request.minRatingsCount() != null) {
            settings.setMinRatingsCount(request.minRatingsCount());
        }
        settings.setUpdatedAt(Instant.now());
        settings.setUpdatedByAdminId(adminId);
        return toResponse(settings);
    }

    private PlatformSettings load() {
        return repository.findById(PlatformSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "В platform_settings нет строки с id = 1 (она создаётся миграцией V7)"));
    }

    private static AdminSettingsResponse toResponse(PlatformSettings s) {
        return new AdminSettingsResponse(s.getCommissionPercent(), s.getMinRatingThreshold(), s.getMinRatingsCount(),
                s.getUpdatedAt(), s.getUpdatedByAdminId());
    }
}
